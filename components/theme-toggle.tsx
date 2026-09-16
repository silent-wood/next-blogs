"use client";

import { IconMoon, IconSun } from "./icons";

const STORAGE_KEY = "buxizhou-theme";

/**
 * 明暗主题切换。
 *
 * 首屏的 dark class 由 app/layout.tsx 里的内联脚本提前写入；
 * 图标的显隐完全交给 CSS（.dark 变体），组件自身不持有状态，
 * 也就没有水合时序问题。
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* 隐私模式下写入失败，忽略 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换明暗主题"
      title="切换明暗主题"
      className="text-ink-muted transition-colors hover:text-ink"
    >
      <span className="dark:hidden">
        <IconSun />
      </span>
      <span className="hidden dark:inline">
        <IconMoon />
      </span>
    </button>
  );
}
