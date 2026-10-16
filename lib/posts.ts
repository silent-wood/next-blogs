import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderMarkdown, toPlainText, type TocItem } from "./markdown";
import { slugifyTaxon } from "./taxonomy";

/* ==========================================================================
   内容层：content/posts/*.md 是唯一数据源
   全部函数只在构建期（server）执行，产出静态 HTML。
   ========================================================================== */

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** 开发环境下允许预览草稿；生产构建一律排除 */
const INCLUDE_DRAFTS = process.env.NODE_ENV === "development";

export type PostMeta = {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  year: number;
  monthDay: string;
  category: string;
  tags: string[];
  summary: string;
  cover: string | null;
  pinned: boolean;
  readingMinutes: number;
};

export type Post = PostMeta & {
  html: string;
  toc: TocItem[];
  body: string;
};

type PostRecord = {
  meta: PostMeta;
  body: string;
  /** 草稿：frontmatter 写 `draft: true`。开发环境可见，生产构建排除。 */
  draft: boolean;
};

/* -------------------------------------------------------------------------- */
/* 解析                                                                        */
/* -------------------------------------------------------------------------- */

/** 文件名形如 2026-09-12-blog-migration.md，slug 取去掉日期前缀的部分 */
function toSlug(fileName: string): string {
  return fileName.replace(/\.mdx?$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/** frontmatter 的 date 可能被 YAML 解析成 Date，统一成 YYYY-MM-DD */
function toDateString(value: unknown, fallback: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return fallback;
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,，]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/** 中文按 400 字/分钟估算，至少 1 分钟 */
function estimateReadingMinutes(plainText: string): number {
  const chars = plainText.replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 400));
}

function parsePost(fileName: string): PostRecord {
  const raw = fs.readFileSync(path.join(POSTS_DIR, fileName), "utf8");
  const { data, content } = matter(raw);

  const slug = toSlug(fileName);
  const fromFileName = fileName.slice(0, 10);
  const date = toDateString(data.date, fromFileName);
  const plain = toPlainText(content);

  if (!data.title) {
    console.warn(`[content] ${fileName} 缺少 title，已用 slug 兜底`);
  }

  return {
    meta: {
      slug,
      title: String(data.title ?? slug),
      date,
      year: Number(date.slice(0, 4)),
      monthDay: date.slice(5).replace("-", "."),
      category: String(data.category ?? "随笔"),
      tags: toTags(data.tags),
      summary: String(data.summary ?? plain.slice(0, 80)),
      cover: typeof data.cover === "string" && data.cover ? data.cover : null,
      pinned: data.pinned === true,
      readingMinutes: estimateReadingMinutes(plain),
    },
    body: content,
    draft: data.draft === true,
  };
}

/* -------------------------------------------------------------------------- */
/* 读取（构建期一次性读入并缓存）                                                */
/* -------------------------------------------------------------------------- */

let cache: PostRecord[] | null = null;

function loadAll(): PostRecord[] {
  if (cache) return cache;
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[content] 未找到目录 ${POSTS_DIR}，站点将按空内容构建`);
    cache = [];
    return cache;
  }

  const records = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parsePost);

  const visible = INCLUDE_DRAFTS ? records : records.filter((r) => !r.draft);
  visible.sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));
  cache = visible;
  return cache;
}

/* -------------------------------------------------------------------------- */
/* 对外接口                                                                    */
/* -------------------------------------------------------------------------- */

export function getAllPosts(): PostMeta[] {
  return loadAll().map((r) => r.meta);
}

export function getFeaturedPost(): PostMeta | null {
  const metas = getAllPosts();
  return metas.find((m) => m.pinned) ?? metas[0] ?? null;
}

export function getPostBySlug(slug: string): Post | null {
  const record = loadAll().find((r) => r.meta.slug === slug);
  if (!record) return null;
  const { html, toc } = renderMarkdown(record.body);
  return { ...record.meta, html, toc, body: record.body };
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((m) => m.slug);
}

export type ArchiveGroup = {
  year: number;
  count: number;
  posts: PostMeta[];
};

export function getArchiveGroups(): ArchiveGroup[] {
  const groups = new Map<number, PostMeta[]>();
  for (const post of getAllPosts()) {
    const list = groups.get(post.year) ?? [];
    list.push(post);
    groups.set(post.year, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, posts]) => ({ year, count: posts.length, posts }));
}

/**
 * 分类 / 标签。
 * `name` 是显示用的原始名称（可能是中文），`slug` 是路由参数用的 ASCII 标识。
 * 二者可能不同，例如 name「算法」→ slug「algorithm」。见 lib/taxonomy.ts。
 */
export type Taxon = { name: string; slug: string; count: number };

function tally(pick: (m: PostMeta) => string[]): Taxon[] {
  const counts = new Map<string, number>();
  for (const meta of getAllPosts()) {
    for (const name of pick(meta)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const taxa = [...counts.entries()]
    .map(([name, count]) => ({ name, slug: slugifyTaxon(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));

  // 同一命名空间内 slug 必须唯一，否则两个词条会抢同一个页面
  const seen = new Map<string, string>();
  for (const { name, slug } of taxa) {
    const clash = seen.get(slug);
    if (clash !== undefined) {
      throw new Error(
        `[taxonomy] slug 冲突：「${clash}」与「${name}」都映射到 "${slug}"，` +
          `请在 lib/taxonomy.ts 的 SLUGS 中区分。`,
      );
    }
    seen.set(slug, name);
  }
  return taxa;
}

export function getCategories(): Taxon[] {
  return tally((m) => [m.category]);
}

export function getTags(): Taxon[] {
  return tally((m) => m.tags);
}

/** 按路由 slug 反查标签，找不到返回 null（由页面决定是否 notFound） */
export function getTagBySlug(slug: string): Taxon | null {
  return getTags().find((t) => t.slug === slug) ?? null;
}

/** 按路由 slug 反查分类，找不到返回 null */
export function getCategoryBySlug(slug: string): Taxon | null {
  return getCategories().find((c) => c.slug === slug) ?? null;
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((m) => m.category === category);
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((m) => m.tags.includes(tag));
}

/** 上下篇按时间顺序相邻，与归档顺序一致 */
export function getAdjacentPosts(slug: string): {
  prev: PostMeta | null;
  next: PostMeta | null;
} {
  const metas = getAllPosts();
  const index = metas.findIndex((m) => m.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: metas[index + 1] ?? null,
    next: metas[index - 1] ?? null,
  };
}

export type SearchDoc = {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  text: string;
};

/** 构建期生成的搜索索引，输出到 /search-index.json */
export function getSearchIndex(): SearchDoc[] {
  return loadAll().map(({ meta, body }) => ({
    slug: meta.slug,
    title: meta.title,
    date: meta.date,
    category: meta.category,
    tags: meta.tags,
    summary: meta.summary,
    text: toPlainText(body).slice(0, 4000),
  }));
}

export function getSiteStats(): { posts: number; tags: number; years: number } {
  const metas = getAllPosts();
  const years = new Set(metas.map((m) => m.year));
  return {
    posts: metas.length,
    tags: getTags().length,
    years: years.size,
  };
}
