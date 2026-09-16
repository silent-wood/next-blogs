import Link from "next/link";
import { siteConfig } from "@/lib/site.config";
import { IconRss } from "./icons";

/**
 * 站点页脚。桌面端为多列，移动端纵向堆叠（同一份结构，靠断点改列数）。
 */
export function SiteFooter() {
  const navItems = [...siteConfig.nav, { label: "搜索", href: "/search" }];

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-16 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          <div>
            <p className="font-serif text-[40px] font-semibold leading-none text-line-strong lg:text-[52px]">
              {siteConfig.name}
            </p>
            <p className="mt-4 text-[13px] text-ink-muted">{siteConfig.tagline}</p>
            <a
              href={`mailto:${siteConfig.author.email}`}
              className="mt-2 block font-mono text-[12px] text-ink-faint transition-colors hover:text-ink"
            >
              {siteConfig.author.email}
            </a>
          </div>

          <nav aria-label="页脚导航">
            <p className="eyebrow">导航 · NAVIGATION</p>
            <ul className="mt-4 space-y-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[13px] text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="eyebrow">订阅 · SUBSCRIBE</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="/rss.xml"
                  className="inline-flex items-center gap-2 text-[13px] text-ink-muted transition-colors hover:text-ink"
                >
                  <IconRss />
                  RSS 订阅
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="font-mono text-[12px] text-ink-muted transition-colors hover:text-ink"
                >
                  sitemap.xml
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.author.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[12px] text-ink-muted transition-colors hover:text-ink"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="font-mono text-[11px] text-ink-faint">
            {new Date().getFullYear()} {siteConfig.author.name} · 保留所有权利
          </p>
          <p className="font-mono text-[11px] text-ink-faint">
            全部文章以 Markdown 存于 Git 仓库 · 静态构建 · 无追踪脚本
          </p>
        </div>
      </div>
    </footer>
  );
}
