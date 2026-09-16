import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getPostsByCategory } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map(({ name }) => ({ category: name }));
}

export async function generateMetadata(
  props: PageProps<"/categories/[category]">,
): Promise<Metadata> {
  const { category } = await props.params;
  const posts = getPostsByCategory(category);
  return {
    title: `分类：${category}`,
    description: `「${category}」分类下的 ${posts.length} 篇文章。`,
    alternates: { canonical: `/categories/${category}` },
  };
}

export default async function CategoryPage(
  props: PageProps<"/categories/[category]">,
) {
  const { category } = await props.params;
  const posts = getPostsByCategory(category);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="flex items-center gap-2.5">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
          <span className="eyebrow">CATEGORY · 分类</span>
        </p>
        <h1 className="mt-5 font-serif text-[36px] font-bold text-ink lg:text-[44px]">
          {category}
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
