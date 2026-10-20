import type { Metadata } from "next";
import Link from "next/link";
import {
  getAllPosts,
  getCategories,
  getFeaturedPost,
  getSiteStats,
  getTags,
} from "@/lib/posts";
import { siteConfig } from "@/lib/site.config";
import { alternatesFor } from "@/lib/seo";
import { NewsletterCard } from "@/components/newsletter-card";

/**
 * 首页此前没有 canonical，也没有 og:url——它是全站唯一缺这两项的路由。
 * openGraph 必须完整重写：Next 对它是浅合并，只写 url 会把父级的
 * title / description / siteName 一并覆盖掉。
 */
export const metadata: Metadata = {
  alternates: alternatesFor("/"),
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "/",
  },
};

const test = 1;

/** 侧栏「现在」卡片：个人状态，改这里即可，不用动布局 */
const NOW = [{ label: "在学", value: "AI Coding" }];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5">
      <span
        className="h-[5px] w-[5px] rounded-full bg-accent"
        aria-hidden="true"
      />
      <span className="eyebrow">{children}</span>
    </p>
  );
}

export default function HomePage() {
  const stats = getSiteStats();
  const featured = getFeaturedPost();
  const others = getAllPosts().filter((post) => post.slug !== featured?.slug);
  const listPosts = others.slice(0, siteConfig.postsOnHome);
  const categories = getCategories();
  const tags = getTags().slice(0, 8);

  return (
    <div className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-24 pt-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16 lg:px-12 lg:pt-16">
      {/* ---------------- 主列 ---------------- */}
      <div>
        {/* 首屏自述 */}
        <section>
          <Eyebrow>
            WRITING SINCE {siteConfig.since} · 一个安静写字的地方
          </Eyebrow>
          <h1 className="mt-5 font-serif text-[40px] font-bold leading-[1.15] text-ink sm:text-[48px] lg:text-[56px]">
            写代码，也写天气。
          </h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-[1.8] text-ink-muted">
            我是{siteConfig.author.name}
            ，一个在写字与写代码之间来回摆渡的人。这里放着我的技术笔记、生活碎片，和一些还没想清楚的问题——没有算法，没有广告，只有一个安静的阅读角落。
          </p>

          <dl className="mt-8 flex gap-10">
            {[
              { value: stats.posts, label: "篇文章" },
              { value: stats.tags, label: "个标签" },
              { value: stats.years, label: "年持续写作" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd className="font-serif text-[26px] font-semibold leading-none text-ink">
                  {item.value}
                </dd>
                <p className="mt-2 font-mono text-[10px] tracking-wide text-ink-faint">
                  {item.label}
                </p>
              </div>
            ))}
          </dl>
        </section>

        {/* 置顶 */}
        {featured && (
          <section className="mt-16" aria-labelledby="pinned-title">
            <div className="flex items-center gap-3">
              <span className="eyebrow" id="pinned-title">
                置顶 · PINNED
              </span>
              <span className="h-px flex-1 bg-line-strong" aria-hidden="true" />
            </div>

            <article className="mt-5 rounded-xs bg-card p-6 transition-colors lg:p-[18px]">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-sm bg-accent px-2 py-[3px] text-[10px] font-medium text-accent-contrast">
                  {featured.category}
                </span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {featured.date.replaceAll("-", " · ")}
                </span>
              </div>

              <h2 className="mt-4 font-serif text-[26px] font-semibold leading-[1.35] text-ink lg:text-[30px]">
                <Link
                  href={`/posts/${featured.slug}`}
                  className="transition-opacity hover:opacity-80"
                >
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-[600px] text-[14px] leading-[1.8] text-ink-muted">
                {featured.summary}
              </p>
              <p className="mt-4 font-mono text-[10px] text-ink-faint">
                {featured.readingMinutes} 分钟阅读 ·{" "}
                <Link
                  href={`/posts/${featured.slug}`}
                  className="hover:text-ink"
                >
                  阅读全文
                </Link>
              </p>
            </article>
          </section>
        )}

        {/* 最新文章 */}
        <section className="mt-16" aria-labelledby="latest-title">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              className="font-serif text-[22px] font-semibold text-ink"
              id="latest-title"
            >
              最新文章
            </h2>
            <Link
              href="/archive"
              className="font-mono text-[11px] text-ink-faint transition-colors hover:text-ink"
            >
              查看全部 {stats.posts} 篇
            </Link>
          </div>

          <div className="mt-2 border-t border-line">
            {listPosts.map((post) => (
              <article
                key={post.slug}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-6 border-b border-line py-6"
              >
                <div>
                  <p className="font-mono text-[13px] font-medium text-ink-muted">
                    {post.monthDay}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ink-ghost">
                    {post.year}
                  </p>
                </div>

                <div>
                  <h3 className="font-serif text-[19px] font-semibold leading-[1.45] text-ink">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="transition-opacity hover:opacity-80"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[13.5px] leading-[1.75] text-ink-muted">
                    {post.summary}
                  </p>
                  <p className="mt-3 font-mono text-[10px] text-ink-ghost">
                    {post.category} · {post.tags.slice(0, 2).join(" · ")} ·{" "}
                    {post.readingMinutes} 分钟阅读
                  </p>
                </div>
              </article>
            ))}
          </div>

          <Link
            href="/archive"
            className="mt-8 inline-block rounded-xs bg-card px-5 py-2.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            加载更早的文章
          </Link>
        </section>
      </div>

      {/* ---------------- 侧栏 ---------------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-8">
          {/* 现在 */}
          <section className="rounded-xs bg-card p-[18px]">
            <p className="eyebrow">NOW · 现在</p>
            <dl className="mt-4 space-y-3">
              {NOW.map((item) => (
                <div key={item.label}>
                  <dt className="font-mono text-[10px] text-ink-ghost">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-[12.5px] leading-[1.7] text-ink-body">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 作者 */}
          <section className="rounded-xs bg-card p-[18px]">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-serif text-[16px] font-semibold text-accent-contrast">
                {siteConfig.author.initials}
              </span>
              <div>
                <p className="font-serif text-[16px] font-semibold text-ink">
                  {siteConfig.author.name}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-faint">
                  前端工程师 · 作者
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-[1.75] text-ink-muted">
              写了六年代码，也写了六年字。相信技术应该让生活变简单，而生活不该被技术填满。
            </p>
            <p className="mt-4 font-mono text-[10px] text-ink-muted">
              <a
                href={siteConfig.author.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                GitHub
              </a>
              {" / "}
              <a href="/rss.xml" className="hover:text-ink">
                RSS
              </a>
              {" / "}
              <a
                href={`mailto:${siteConfig.author.email}`}
                className="hover:text-ink"
              >
                邮件
              </a>
            </p>
          </section>

          {/* 分类 */}
          <section>
            <p className="eyebrow">分类 · CATEGORIES</p>
            <ul className="mt-4 space-y-2.5">
              {categories.map((category) => (
                <li
                  key={category.name}
                  className="flex items-baseline justify-between"
                >
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-[13px] text-ink-body transition-colors hover:text-ink"
                  >
                    {category.name}
                  </Link>
                  <span className="font-mono text-[11px] text-ink-ghost">
                    {category.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 标签 */}
          <section>
            <p className="eyebrow">热门标签 · TAGS</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.name}>
                  <Link
                    href={`/tags/${tag.slug}`}
                    className="inline-block rounded-xs bg-chip px-2 py-1 font-mono text-[10px] text-ink-muted transition-colors hover:text-ink"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <NewsletterCard />
        </div>
      </aside>
    </div>
  );
}
