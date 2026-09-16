"use client";

import { useEffect } from "react";

/**
 * 代码块「复制」按钮的行为层。
 *
 * 按钮本身由构建期的 Markdown 渲染器产出（见 lib/markdown.ts），
 * 这里只挂一次事件委托 —— 不给每个代码块单独发客户端组件。
 */
export function CodeCopy() {
  useEffect(() => {
    async function handleClick(event: MouseEvent) {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-copy]",
      );
      if (!button) return;

      const code = button.closest(".code-block")?.querySelector("code");
      if (!code) return;

      const text = code.textContent ?? "";
      let copied = false;

      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // 非 HTTPS 或权限受限时的兜底
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
        document.body.removeChild(textarea);
      }

      const original = button.textContent;
      button.textContent = copied ? "已复制" : "复制失败";
      window.setTimeout(() => {
        button.textContent = original ?? "复制";
      }, 1600);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
