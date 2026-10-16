import type { Metadata } from "next";
import Link from "next/link";
import { getTags } from "@/lib/posts";

export const metadata: Metadata = {
  title: "标签",
  description: "全部标签一览。",
  alternates: { canonical: "/tags" },
};

export default function TagsPage() {
  const tags = getTags();

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="flex items-center gap-2.5">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
          <span className="eyebrow">TAGS · 标签</span>
        </p>
        <h1 className="mt-5 font-serif text-[36px] font-bold text-ink lg:text-[44px]">
          {tags.length} 个标签
        </h1>
        <hr className="mt-8 border-line" />
      </header>

      <ul className="mt-8 flex flex-wrap gap-3">
        {tags.map((tag) => (
          <li key={tag.name}>
            <Link
              href={`/tags/${tag.slug}`}
              className="inline-flex items-baseline gap-2 rounded-xs bg-chip px-3 py-2 transition-colors hover:bg-line"
            >
              <span className="text-[13px] text-ink-body">{tag.name}</span>
              <span className="font-mono text-[10px] text-ink-ghost">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
