# 不系舟 · 个人博客

李顺的个人博客。文章以 Markdown 存于本仓库，`git push` 即发布，全站静态，无后台、无登录、无数据库。

## 快速开始

```bash
pnpm install        # 安装依赖（Node 20+，本仓库用 pnpm 11）
pnpm dev            # 本地开发，http://localhost:3000，草稿可见
pnpm build          # 生产构建，静态产物输出到 out/
pnpm lint           # 代码检查
```

预览构建产物：

```bash
pnpm build && python3 -m http.server 4173 --directory out
# 打开 http://127.0.0.1:4173
```

（产物开了 `trailingSlash`，每个路由都是 `dir/index.html`，所以 `/about/`、`/tags/algorithm/`
这类地址用静态服务器也能直接访问；`next dev` 下则需要带尾斜杠或由 Next 自行重定向。）

## 写一篇文章

1. 在 `content/posts/` 新建 `YYYY-MM-DD-slug.md`（slug 会成为 URL：`/posts/slug`）
2. 写 frontmatter + 正文
3. `git add . && git commit -m "新文章：标题" && git push`

一两分钟后 GitHub Actions 构建并部署完成，线上自动更新。

```md
---
title: 文章标题
date: 2026-09-12          # 用于排序与归档分组
category: 随笔             # 单值，决定分类页
tags: [写作, 独立站点]      # 数组或逗号分隔字符串
summary: 摘要，显示在列表与分享卡。
# cover: /images/posts/xxx.jpg   可选，文章头图（OG 分享用）
# pinned: true                   可选，置顶到首页
# draft: true                    可选，草稿（生产构建自动排除）
---

正文 Markdown。图片用绝对路径：![说明](/images/posts/xxx.jpg)
```

**约定：**

- md 文件放 `content/posts/`，**永远不要放 `public/`**（放进去会被原样下载）
- 图片放 `public/images/posts/`，上传前压好（宽 ≤ 1600px，WebP/JPEG，单张 ≤ 300 KB；本站关闭了运行时图片优化）
- 正文里引用图片用**绝对路径** `/images/...`，不要用相对路径
- **标签 / 分类的 URL 一律用 ASCII slug**（标签「算法」→ `/tags/algorithm`）。新增中文词条后构建会**故意报错**，
  需在 `lib/taxonomy.ts` 的 `SLUGS` 里登记 slug。原因：静态导出下中文参数在 dev 会被百分号编码，
  Next 会判定 `generateStaticParams()` 缺参数并让页面 404。

## 目录结构

```
├─ app/                     路由与页面（App Router）
│  ├─ page.tsx              首页
│  ├─ posts/[slug]/         文章详情（构建期枚举全部路径）
│  ├─ archive/              归档（按年分组）
│  ├─ categories/[category] 分类（参数为 ASCII slug）
│  ├─ tags/[tag]            标签（参数为 ASCII slug）
│  ├─ search/               搜索（构建期索引 + 客户端匹配）
│  ├─ rss.xml/route.ts      RSS（构建期生成）
│  ├─ search-index.json/    搜索索引（构建期生成）
│  ├─ sitemap.ts / robots.ts
│  └─ globals.css           设计令牌（色板/字体/圆角的唯一来源）
├─ components/              页头、页脚、主题切换、目录、评论等
├─ content/posts/           ★ 文章（唯一数据源）
├─ lib/                     内容解析、Markdown 渲染、站点配置
├─ public/images/           图片（原样拷贝进构建产物）
└─ out/                     构建产物（已 gitignore）
```

## 站点配置

`lib/site.config.ts`：站名、作者、导航、页脚、订阅、Giscus 评论、统计。
全部是源码常量，改完提交即生效。

**部署前必改两项：**

1. `siteConfig.url`（或设环境变量 `NEXT_PUBLIC_SITE_URL`）——影响 RSS / sitemap / 分享链接的绝对地址
2. `siteConfig.giscus` ——到 [giscus.app](https://giscus.app) 用仓库生成四项填入，评论区才会激活（未配置时显示说明占位）

**可选：**

- 邮件订阅：填 `newsletter.provider` + `action`（第三方服务，如 Buttondown）
- 统计：填 `analytics.provider`（默认不注入任何脚本）

## 部署

### 产线：GitHub Pages

仓库名为 `silent-wood.github.io`，站点因此位于 GitHub Pages 的**根路径**，不需要 `basePath`。
代码里没有任何一处依赖仓库名——将来绑自有域名，同样不需要改代码。

走 **Actions 产物**路线（`.github/workflows/deploy-pages.yml`）：
`push` 到 `main` → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build` → 校验产物 →
上传 `out/` → 部署。

**首次开通（只做一次）：**

1. 仓库 `Settings → Pages → Build and deployment → Source` 选 **GitHub Actions**
   （不要选 "Deploy from a branch"：那条路走的是不可定制的内部 Jekyll 构建，对 Next.js 基本不可用）
2. `Settings → Secrets and variables → Actions → Variables` 新增 `NEXT_PUBLIC_SITE_URL`
   = `https://silent-wood.github.io`（不带结尾斜杠）

第 2 步是可选的：未配置时 workflow 会回退到同一个地址。显式配置只是更不容易踩空。

**三条与静态托管相关的约定：**

- `next.config.ts` 开启了 `trailingSlash: true` —— 每个路由产出 `dir/index.html`，
  避免 `about.html` 与 `about/` 目录并存的歧义形态。带扩展名的 route handler
  （`rss.xml` / `sitemap.xml` / `robots.txt` / `search-index.json`）不受影响，仍是文件。
- `public/.nojekyll` —— 走 Actions 产物路线时它不是必需（Jekyll 不参与）；保留它只是防住
  将来有人切回分支部署路线，那时 Jekyll 会吞掉 `_next/` 让全站 CSS/JS 404。
- 静态导出**不支持 `redirects`**：改路由路径就等于旧链接 404，需要的话得额外产出跳转桩页。

### 备用：Vercel

Vercel 项目仍在，同一个 `main` 分支推送后两边都会构建。**但 canonical 只能有一个**：
RSS / sitemap / `og:url` 里的绝对域名由 `NEXT_PUBLIC_SITE_URL` 决定，两个平台各读各的环境变量。
若以 Pages 为准，请在 Vercel 项目里也把 `NEXT_PUBLIC_SITE_URL` 设为 `https://silent-wood.github.io`；
或者直接下线 Vercel，避免同一份内容出现两个 canonical。

**说明：**

- 本站开启 `output: "export"`，构建产物是纯静态文件（`out/`）。Vercel 会自动识别；
  将来若迁到 Cloudflare Pages / 自己的服务器，直接托管 `out/` 即可，无需改代码
- Vercel Hobby 免费层限个人非商业用途；不做商业化即可长期免费使用
- `vercel.app` 与 `github.io` 默认域名在国内访问都不稳，建议尽早绑定自有域名。

## 技术栈

Next.js 16（App Router · Turbopack · 静态导出）· React 19 · Tailwind CSS v4 · TypeScript · gray-matter + marked
