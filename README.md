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

## 技术栈

Next.js 16（App Router · Turbopack · 静态导出）· React 19 · Tailwind CSS v4 · TypeScript · gray-matter + marked
