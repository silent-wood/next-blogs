import type { Metadata } from "next";
import { SearchClient } from "@/components/search-client";

export const metadata: Metadata = {
  title: "搜索",
  description: "在全部文章中搜索标题、摘要与正文。",
  alternates: { canonical: "/search" },
  /** 搜索页是纯交互页，不让搜索引擎收录 */
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-[680px] px-5 pb-24 pt-12 lg:pt-16">
      <header className="mb-8">
        <p className="flex items-center gap-2.5">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
          <span className="eyebrow">SEARCH · 搜索</span>
        </p>
        <h1 className="mt-5 font-serif text-[32px] font-bold text-ink lg:text-[40px]">
          搜一搜
        </h1>
      </header>
      <SearchClient />
    </div>
  );
}
