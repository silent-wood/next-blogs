"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

/**
 * 文章目录，带滚动定位。
 * 设计稿里当前项为强调色，其余为次级色。
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      // 头部 72px 固定，留出安全边界
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="文章目录">
      <p className="eyebrow">目录 · CONTENTS</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className={item.depth === 3 ? "pl-4" : undefined}>
              <a
                href={`#${item.id}`}
                aria-current={active ? "location" : undefined}
                className={`block text-[13px] leading-[1.6] transition-colors ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
