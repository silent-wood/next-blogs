import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdjacentPosts, getPostBySlug, getPostSlugs } from "@/lib/posts";
import { siteConfig } from "@/lib/site.config";
import { GiscusComments } from "@/components/giscus-comments";
import { TableOfContents } from "@/components/table-of-contents";

/** 静态导出：所有路径在构建期枚举，访问不存在的 slug 直接 404 */
export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/posts/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/posts/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: `/posts/${post.slug}`,
      publishedTime: post.date,
      authors: [siteConfig.author.name],
      tags: post.tags,
      images: post.cover ? [{ url: post.cover }] : undefined,
    },
  };
}

export default async function PostPage(props: PageProps<"/posts/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { prev, next } = getAdjacentPosts(slug);

  return (
    <div className="mx-auto max-w-[680px] px-5 pb-24 pt-10 lg:pt-14">
      {/* 文章头部 */}
      <header>
        <div className="flex items-center gap-3.5">
          <Link
            href={`/categories/${encodeURIComponent(post.category)}`}
            className="rounded-sm bg-accent px-2.5 py-[5px] text-[10px] font-medium text-accent-contrast"
          >
            {post.category}
          </Link>
          <span className="font-mono text-[11px] text-ink-faint">
            {post.readingMinutes} 分钟阅读
          </span>
        </div>

        <h1 className="mt-5 font-serif text-[30px] font-bold leading-[1.35] text-ink lg:text-[38px]">
          {post.title}
        </h1>

        <p className="mt-4 text-[15px] leading-[1.8] text-ink-muted">{post.summary}</p>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-serif text-[13px] font-semibold text-accent-contrast">
            {siteConfig.author.initials}
          </span>
          <span className="text-[12px] font-medium text-ink-body">
            {siteConfig.author.name}
          </span>
          <span className="font-mono text-[11px] text-ink-faint">
            {post.date.replaceAll("-", " · ")}
          </span>
        </div>

        <hr className="mt-8 border-line" />
      </header>

      {/* 目录 */}
      {post.toc.length > 0 && (
        <div className="mt-8 rounded-xs bg-card p-[18px]">
          <TableOfContents items={post.toc} />
        </div>
      )}

      {/* 正文 */}
      <article
        className="prose-editorial mt-10"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      {/* 标签 */}
      {post.tags.length > 0 && (
        <section className="mt-14 border-t border-line pt-8" aria-label="文章标签">
          <p className="eyebrow">标签 · TAGS</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="inline-block rounded-xs bg-chip px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:text-ink"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 上下篇 */}
      <nav
        className="mt-10 grid gap-3 border-t border-line pt-2 sm:grid-cols-2"
        aria-label="上下篇"
      >
        {prev ? (
          <Link
            href={`/posts/${prev.slug}`}
            className="group rounded-xs bg-card p-4 transition-colors hover:bg-chip"
          >
            <p className="eyebrow">上一篇</p>
            <p className="mt-2 font-serif text-[14px] font-semibold leading-[1.5] text-ink">
              {prev.title}
            </p>
          </Link>
        ) : (
          <span />
        )}

        {next && (
          <Link
            href={`/posts/${next.slug}`}
            className="group rounded-xs bg-card p-4 text-right transition-colors hover:bg-chip"
          >
            <p className="eyebrow">下一篇</p>
            <p className="mt-2 font-serif text-[14px] font-semibold leading-[1.5] text-ink">
              {next.title}
            </p>
          </Link>
        )}
      </nav>

      {/* 评论 */}
      <div className="mt-12 border-t border-line pt-8">
        <GiscusComments />
      </div>
    </div>
  );
}
