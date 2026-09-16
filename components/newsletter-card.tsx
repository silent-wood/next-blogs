import { siteConfig } from "@/lib/site.config";

/**
 * 邮件订阅卡片。
 *
 * 静态站自身收不了邮箱 —— Vercel 上没有可写数据库，
 * 所以这里只做「转发到第三方服务」的表单壳子。
 * 未配置 provider 时渲染说明态，不假装能订阅。
 */
export function NewsletterCard() {
  const { provider, action, note, placeholder } = siteConfig.newsletter;
  const configured = Boolean(provider && action);

  return (
    <section className="rounded-xs bg-chip p-[18px]" aria-labelledby="newsletter-title">
      <p className="eyebrow" id="newsletter-title">
        Newsletter · 每月一封
      </p>
      <p className="mt-3 text-[12px] leading-[1.7] text-ink-body">{note}</p>

      {configured ? (
        <form
          action={action}
          method="post"
          target="_blank"
          className="mt-3 flex items-center justify-between gap-2 rounded-xs bg-card py-1 pl-3 pr-1"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            邮箱地址
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-ink outline-none placeholder:text-ink-ghost"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xs bg-accent px-3.5 py-2 text-[11px] font-medium text-accent-contrast transition-opacity hover:opacity-90"
          >
            订阅
          </button>
        </form>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-xs bg-card py-1 pl-3 pr-1">
            <span className="font-mono text-[11px] text-ink-ghost">{placeholder}</span>
            <span className="shrink-0 rounded-xs bg-line-strong px-3.5 py-2 text-[11px] font-medium text-ink-faint">
              订阅
            </span>
          </div>
          <p className="font-mono text-[10px] text-ink-ghost">
            未接入：静态站需第三方邮件服务，在 lib/site.config.ts 配置后生效
          </p>
        </div>
      )}
    </section>
  );
}
