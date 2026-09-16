import Link from "next/link";
import { siteConfig } from "@/lib/site.config";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col items-start px-5 pb-32 pt-24">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1 className="mt-5 font-serif text-[40px] font-bold leading-tight text-ink">
        这一页不在船上。
      </h1>
      <p className="mt-4 text-[15px] leading-[1.8] text-ink-muted">
        地址可能改了，或者这篇文章还没写。你可以回首页，或者搜一下关键词。
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-xs bg-accent px-5 py-2.5 text-[12px] font-medium text-accent-contrast transition-opacity hover:opacity-90"
        >
          回首页
        </Link>
        <Link
          href="/search"
          className="rounded-xs bg-card px-5 py-2.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          去搜索
        </Link>
      </div>
      <p className="mt-10 font-mono text-[11px] text-ink-ghost">
        {siteConfig.name} · {siteConfig.tagline}
      </p>
    </div>
  );
}
