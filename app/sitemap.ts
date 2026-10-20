import type { MetadataRoute } from "next";
import { getAllPosts, getCategories, getTags } from "@/lib/posts";
import { siteConfig } from "@/lib/site.config";

/** 静态导出要求：构建期产出静态文件 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  /**
   * next.config 里开了 trailingSlash: true，站内每个路由的真实地址都以 / 结尾。
   * 这里必须跟着加，否则 sitemap 里的 81 条 URL 全部指向会 301 的旧形态：
   * 爬虫要为每一条多走一跳，而且「sitemap 里的地址」与「实际地址」不一致，
   * 属于会静默存在很久的那类问题 —— 页面能打开，只是每条都绕一次。
   */
  const url = (path: string) => `${base}${path}/`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: url("/archive"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: url("/categories"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/tags"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: url(`/posts/${post.slug}`),
    lastModified: new Date(post.date),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  const categories: MetadataRoute.Sitemap = getCategories().map(({ slug }) => ({
    url: url(`/categories/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tags: MetadataRoute.Sitemap = getTags().map(({ slug }) => ({
    url: url(`/tags/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticRoutes, ...posts, ...categories, ...tags];
}
