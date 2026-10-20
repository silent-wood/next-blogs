# Copilot 代码评审指引（本仓库专用）

你是 next-blogs 这个静态博客项目的评审助手。评审 PR 时请依据以下项目约束给出意见。
这些约束来自本仓库的真实工程约定，违反时应明确指出。

## 项目事实

- 技术栈：Next.js 16（App Router + Turbopack）+ React 19 + Tailwind v4 + TypeScript，
  包管理器 pnpm，纯静态导出（`next.config.ts` 里 `output: "export"`）。
- 产物是 `out/`，构建期用 `fs` 读取 `content/posts/*.md`，**无数据库、无 API 路由、无服务端运行时逻辑**。
- 部署：GitHub Actions（`.github/workflows/deploy-pages.yml`）在 push / PR 到 `main` 时
  自动构建并发布到 https://silencewood.cn。
- 自定义域名已配，生产域名为 `https://silencewood.cn`。

## 评审重点（违反即应指出）

1. **禁止引入服务端代码**：本仓库是纯静态导出。任何 `export const dynamic`、
   Route Handler（`app/**/route.ts`）、`server-only` 包、或在客户端读取非
   `NEXT_PUBLIC_` 前缀的环境变量，都应拦截——静态导出下这些要么构建失败、要么根本跑不了。
2. **trailingSlash 一致性**：`next.config.ts` 设了 `trailingSlash: true`，
   所有站内链接、sitemap、canonical、og:url 的真实地址都带尾斜杠。
   若新增页面或拼接 URL，必须补 `/`，否则线上会 301（此前踩过 81 条 URL 301 的真 bug）。
3. **标签 / 分类 URL 必须用 ASCII slug**：显示名可中文，路由参数必须登记在
   `lib/taxonomy.ts` 的 `SLUGS`；未登记或同命名空间重复会在构建期故意抛错。
4. **Markdown 内容规范**：文章放 `content/posts/`，图片放 `public/images/posts/`
   并用绝对路径 `/images/...` 引用；图片宽 ≤1600px、≤300KB（运行时图片优化已关闭）。
5. **SEO 写法**：新增页面统一用 `lib/seo.ts` 的 `alternatesFor(path)` 输出
   canonical + RSS，不要手写 `metadata.alternates`——Next 的 metadata 是浅合并，
   手写会整体覆盖根布局的 alternates，把 RSS 类型丢掉。

## CI 约定（改动 workflow 时务必遵守）

- `deploy-pages.yml` 有 quality / build / deploy / smoke 四个 job。
- `typecheck` 脚本是 `next typegen && tsc --noEmit`，**不要改回纯 `tsc --noEmit`**——
  CI 是干净虚拟机、没有 `.next/types`，改回会让 quality job 满屏 TS2304。
- `docs/ci-cd-reference.yml` 是仅供查阅的参考手册，**不是 workflow**，不要当流水线执行或提交到 Actions。

## 不必纠缠

- 纯排版、拼写、中英文混排风格问题，除非明显影响可读性，否则不需逐条指出。
- 已有的 warning 级 ESLint 规则（如 `@typescript-eslint/no-unused-vars`）不计入 CI 失败，
  不要要求改成 error 级。

## 评审语气

- 用中文，给出「问题 + 违反的约束 + 建议改法」三要素，避免空泛的"建议优化"。
- 对确定会破坏构建 / 线上行为的改动，明确标注为 **必须修改**；对风格类问题标注为 **建议**。
