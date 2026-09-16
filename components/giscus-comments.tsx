"use client";

import { useEffect, useRef } from "react";
import { siteConfig } from "@/lib/site.config";

/**
 * 评论：Giscus（GitHub Discussions 驱动）。
 *
 * 未配置时渲染设计稿里的说明占位，不加载任何第三方脚本；
 * 在 lib/site.config.ts 填入四项后自动激活。
 * 站点自身不保存任何读者账号与凭证。
 */
export function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { repo, repoId, category, categoryId } = siteConfig.giscus;
  const configured = Boolean(repo && repoId && categoryId);

  useEffect(() => {
    if (!configured) return;
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute(
      "data-theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");

    container.appendChild(script);

    // 主题切换时同步 Giscus 配色
    const observer = new MutationObserver(() => {
      const frame = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
      if (!frame?.contentWindow) return;
      frame.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: document.documentElement.classList.contains("dark")
                ? "dark"
                : "light",
            },
          },
        },
        "https://giscus.app",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      container.innerHTML = "";
    };
  }, [configured, repo, repoId, category, categoryId]);

  return (
    <section aria-labelledby="comments-title">
      <p className="eyebrow" id="comments-title">
        评论 · COMMENTS
      </p>

      {configured ? (
        <div ref={containerRef} className="mt-4" />
      ) : (
        <div className="mt-4 space-y-2 rounded-xs bg-card px-5 py-7">
          <p className="text-[13px] text-ink-muted">
            评论由 Giscus 承载 · 需要 GitHub 账号登录
          </p>
          <p className="font-mono text-[11px] text-ink-faint">
            站点不保存任何读者账号与凭证
          </p>
          <p className="font-mono text-[10px] text-ink-ghost">
            未配置：在 lib/site.config.ts 填入 giscus 的 repo / repoId / category / categoryId
          </p>
        </div>
      )}
    </section>
  );
}
