import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getPostsByCategory } from "@/lib/posts";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

/**
 * 路由参数是分类的 ASCII slug（不是中文显示名）——原因见 lib/taxonomy.ts。
 * 中文若直接进 URL，dev 下会被百分号编码，导致 Next 判定缺参数并 404。
 */
export function generateStaticParams() {
  return getCategories().map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata(
  props: PageProps<"/categories/[category]">,
): Promise<Metadata> {
  const { category: slug } = await props.params;
  const taxon = getCategoryBySlug(slug);
  if (!taxon) return { title: "分类未找到" };
  const posts = getPostsByCategory(taxon.name);
  return {
    title: `分类：${taxon.name}`,
    description: `「${taxon.name}」分类下的 ${posts.length} 篇文章。`,
    alternates: alternatesFor(`/categories/${slug}`),
  };
}

export default async function CategoryPage(
  props: PageProps<"/categories/[category]">,
) {
  const { category: slug } = await props.params;
  const taxon = getCategoryBySlug(slug);
  if (!taxon) notFound();
  const posts = getPostsByCategory(taxon.name);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="flex items-center gap-2.5">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
          <span className="eyebrow">CATEGORY · 分类</span>
        </p>
        <h1 className="mt-5 font-serif text-[36px] font-bold text-ink lg:text-[44px]">
          {taxon.name}
        </h1>
        <p className="mt-3 text-[14px] text-ink-muted">{posts.length} 篇文章</p>
        <hr className="mt-8 border-line" />
      </header>

      <ul className="mt-2 border-t border-line">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-line">
            <Link
              href={`/posts/${post.slug}`}
              className="group grid grid-cols-[72px_minmax(0,1fr)_auto] items-baseline gap-5 py-4"
            >
              <span className="font-mono text-[12px] text-ink-ghost">{post.date}</span>
              <span className="font-serif text-[16px] font-semibold leading-[1.5] text-ink transition-opacity group-hover:opacity-75">
                {post.title}
              </span>
              <span className="hidden font-mono text-[11px] text-ink-ghost sm:inline">
                {post.readingMinutes} 分钟
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link
          href="/categories"
          className="font-mono text-[11px] text-ink-faint transition-colors hover:text-ink"
        >
          ← 全部分类
        </Link>
      </p>
    </div>
  );
}
