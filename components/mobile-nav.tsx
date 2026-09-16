"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site.config";
import { IconClose, IconMenu } from "./icons";

/**
 * 移动端折叠菜单（断点 < 1024px）。
 * 设计稿里移动端导航收敛为「标识 + 搜索 + 主题 + 菜单」，
 * 主导航项进入这个面板。
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // 打开时锁定滚动，Esc 关闭
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开菜单"
        aria-expanded={open}
        className="text-ink-muted transition-colors hover:text-ink lg:hidden"
      >
        <IconMenu />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-paper lg:hidden">
          <div className="flex h-14 items-center justify-between border-b border-line px-5">
            <span className="font-serif text-[18px] font-semibold text-ink">
              {siteConfig.name}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="关闭菜单"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <IconClose />
            </button>
          </div>

          <nav className="flex flex-col px-5 py-4" aria-label="移动端导航">
            {[...siteConfig.nav, { label: "搜索", href: "/search" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="border-b border-line py-4 font-serif text-[20px] font-semibold text-ink last:border-b-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-5 py-4">
            <p className="eyebrow">RSS</p>
            <a
              href="/rss.xml"
              className="mt-2 inline-block font-mono text-[12px] text-ink-muted hover:text-ink"
            >
              /rss.xml
            </a>
          </div>
        </div>
      )}
    </>
  );
}
