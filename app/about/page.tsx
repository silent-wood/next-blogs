import type { Metadata } from "next";
import Link from "next/link";
import { getSiteStats } from "@/lib/posts";
import { siteConfig } from "@/lib/site.config";
import { NewsletterCard } from "@/components/newsletter-card";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "关于",
  description: `你好，我是${siteConfig.author.name}。写了六年代码，也写了六年字。`,
  alternates: alternatesFor("/about"),
};

const DOING = [
  "维护一套前端基础设施，让它足够稳，以至于没有人需要想起它。",
  "每月写一封 newsletter，只写值得留下的东西，不做更新提醒。",
  "把读过的书、走过的路，整理成可以重读的文字。",
];

const NOW = [{ label: "在学", value: "AI Coding" }];

const SITE_FACTS = [
  { key: "写作工具", value: "Obsidian · 手写初稿" },
  { key: "构建方式", value: "Next.js · 静态生成" },
  { key: "部署与备份", value: "Vercel · Git 推送即发布" },
  { key: "评论与搜索", value: "Giscus · 构建期索引" },
];

const MOMENTS = [
  { src: "/images/about/sea.svg", alt: "海边" },
  { src: "/images/about/desk.svg", alt: "书桌" },
  { src: "/images/about/film.svg", alt: "胶片" },
];

export default function AboutPage() {
  const stats = getSiteStats();

  return (
    <div className="mx-auto grid max-w-360 gap-12 px-5 pb-24 pt-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16 lg:px-12 lg:pt-16">
      <div className="max-w-170">
        {/* 头部 */}
        <header>
          <span className="flex h-19 w-19 items-center justify-center rounded-full bg-accent font-serif text-[28px] font-semibold text-accent-contrast">
            {siteConfig.author.initials}
          </span>

          <p className="mt-6 flex items-center gap-2.5">
            <span
              className="h-1.25 w-1.25 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span className="eyebrow">ABOUT · 关于</span>
          </p>

          <h1 className="mt-4 font-serif text-[32px] font-bold text-ink lg:text-[40px]">
            你好，我是{siteConfig.author.name}。
          </h1>

          <p className="mt-5 text-[15px] leading-[1.85] text-ink-body">
            写了六年代码，也写了六年字。白天在一家做工具的公司维护前端基础设施，晚上回到这里，写一些更慢的东西。
          </p>
          <p className="mt-4 text-[15px] leading-[1.85] text-ink-body">
            我相信两件看起来矛盾的事：技术应该让生活变简单，而生活不该被技术填满。
          </p>

          <p className="mt-5 font-mono text-[11px] text-ink-muted">
            {siteConfig.author.links.map((link, index) => (
              <span key={link.label}>
                {index > 0 && " / "}
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    link.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="transition-colors hover:text-ink"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </p>

          <hr className="mt-10 border-line" />
        </header>

        {/* 我在做的事 */}
        <section className="mt-10" aria-labelledby="doing-title">
          <p className="eyebrow" id="doing-title">
            我在做的事 · NOW DOING
          </p>
          <ol className="mt-5 space-y-4">
            {DOING.map((item, index) => (
              <li key={item} className="flex gap-4">
                <span className="w-5 shrink-0 font-mono text-[11px] text-ink-ghost">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] leading-[1.8] text-ink-body">
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* 这个站点 */}
        <section className="mt-12" aria-labelledby="site-title">
          <p className="eyebrow" id="site-title">
            这个站点 · THE SITE
          </p>
          <p className="mt-4 text-[14px] leading-[1.85] text-ink-body">
            「{siteConfig.name}」建于 {siteConfig.since} 年。目前收录{" "}
            {stats.posts} 篇文章。文章以 Markdown 存于 Git
            仓库，静态构建，全站没有追踪脚本，也不放广告。
          </p>
          <dl className="mt-6 space-y-0 border-t border-line">
            {SITE_FACTS.map((fact) => (
              <div
                key={fact.key}
                className="flex items-baseline justify-between border-b border-line py-3"
              >
                <dt className="text-[13px] text-ink-muted">{fact.key}</dt>
                <dd className="font-mono text-[11px] text-ink-body">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 生活切片 */}
        <section className="mt-12" aria-labelledby="moments-title">
          <p className="eyebrow" id="moments-title">
            生活切片 · MOMENTS
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {MOMENTS.map((moment) => (
              <li key={moment.src} className="overflow-hidden rounded-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={moment.src}
                  alt={moment.alt}
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 侧栏 */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-8">
          <section className="rounded-xs bg-card p-4.5">
            <p className="eyebrow">现在 · NOW</p>
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

          <section className="rounded-xs bg-card p-4.5">
            <p className="eyebrow">联系 · CONTACT</p>
            <dl className="mt-4 space-y-0">
              {siteConfig.author.links.map((link) => (
                <div
                  key={link.label}
                  className="flex items-baseline justify-between border-b border-line py-2.5 last:border-b-0"
                >
                  <dt className="text-[12.5px] text-ink-muted">{link.label}</dt>
                  <dd className="font-mono text-[11px]">
                    <a
                      href={link.href}
                      target={
                        link.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="text-ink-body transition-colors hover:text-ink"
                    >
                      {link.value}
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <NewsletterCard />

          <p className="text-center">
            <Link
              href="/archive"
              className="font-mono text-[11px] text-ink-faint transition-colors hover:text-ink"
            >
              去归档看看全部 {stats.posts} 篇 →
            </Link>
          </p>
        </div>
      </aside>
    </div>
  );
}
