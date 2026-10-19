import type { Metadata } from "next";
import Link from "next/link";
import { getArchiveGroups, getSiteStats } from "@/lib/posts";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "归档",
  description: "全部文章按时间倒序排列，一年一年，都在这里。",
  alternates: alternatesFor("/archive"),
};

export default function ArchivePage() {
  const groups = getArchiveGroups();
  const stats = getSiteStats();

  return (
    <div className="mx-auto max-w-240 px-5 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="flex items-center gap-2.5">
          <span
            className="h-1.25 w-1.25 rounded-full bg-accent"
            aria-hidden="true"
          />
          <span className="eyebrow">ARCHIVE · 归档</span>
        </p>
        <h1 className="mt-5 font-serif text-[36px] font-bold text-ink lg:text-[48px]">
          全部文章
        </h1>
        <p className="mt-3 text-[14px] leading-[1.8] text-ink-muted">
          按时间倒序排列。{stats.posts} 篇文章，跨越 {stats.years}{" "}
          年，没有删除过任何一篇。
        </p>
        <hr className="mt-8 border-line" />
      </header>

      <div className="mt-4 space-y-10">
        {groups.map((group) => (
          <section key={group.year} aria-labelledby={`year-${group.year}`}>
            <div className="grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-12">
              {/* 年份 */}
              <div>
                <h2
                  className="font-serif text-[28px] font-semibold leading-none text-ink lg:text-[36px]"
                  id={`year-${group.year}`}
                >
                  {group.year}
                </h2>
                <p className="mt-2 font-mono text-[11px] text-ink-ghost">
                  {group.count} 篇
                </p>
              </div>

              {/* 条目 */}
              <ul className="border-t border-line">
                {group.posts.map((post) => (
                  <li key={post.slug} className="border-b border-line">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-baseline gap-5 py-4 transition-colors"
                    >
                      <span className="font-mono text-[12px] text-ink-ghost">
                        {post.monthDay}
                      </span>
                      <span className="font-serif text-[16px] font-semibold leading-normal text-ink transition-opacity group-hover:opacity-75 lg:text-[17px]">
                        {post.title}
                      </span>
                      <span className="text-[12px] text-ink-faint">
                        {post.category}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
