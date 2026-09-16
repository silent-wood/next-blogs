import Link from "next/link";
import { siteConfig } from "@/lib/site.config";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { SiteMark } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { IconSearch } from "./icons";

/**
 * 站点头部：桌面端为「标识 + 主导航 + 工具」一行；
 * 移动端收敛为「标识 + 搜索 + 主题 + 菜单」。
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-5 lg:h-[72px] lg:px-16">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink"
            aria-label={`${siteConfig.name} 首页`}
          >
            <SiteMark size={20} />
            <span className="font-serif text-[18px] font-semibold lg:text-[20px]">
              {siteConfig.name}
            </span>
          </Link>

          <NavLinks className="hidden items-center gap-8 lg:flex" />
        </div>

        <div className="flex items-center gap-4 lg:gap-5">
          <Link
            href="/search"
            aria-label="搜索文章"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <IconSearch />
          </Link>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
