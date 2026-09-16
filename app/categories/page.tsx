import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getPostsByCategory } from "@/lib/posts";

export const metadata: Metadata = {
  title: "分类",
  description: "按主题浏览全部文章。",
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  const categories = getCategories();

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="flex items-center gap-2.5">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
          <span className="eyebrow">CATEGORIES · 分类</span>
        </p>
        <h1 className="mt-5 font-serif text-[36px] font-bold text-ink lg:text-[44px]">
          按主题浏览
        </h1>
        <hr className="mt-8 border-line" />
      </header>

      <ul className="mt-2">
        {categories.map((category) => {
          const latest = getPostsByCategory(category.name).slice(0, 3);
          return (
            <li key={category.name} className="border-b border-line py-6">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-[22px] font-semibold text-ink">
                  <Link
                    href={`/categories/${encodeURIComponent(category.name)}`}
                    className="transition-opacity hover:opacity-75"
                  >
                    {category.name}
                  </Link>
                </h2>
                <span className="font-mono text-[11px] text-ink-ghost">
                  {category.count} 篇
                </span>
              </div>
              <p className="mt-2 line-clamp-1 font-mono text-[11px] text-ink-faint">
                {latest.map((post) => post.title).join(" / ")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
