import type { MetadataRoute } from "next";
import { getAllPosts, getCategories, getTags } from "@/lib/posts";
import { siteConfig } from "@/lib/site.config";

/** 静态导出要求：构建期产出静态文件 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/archive`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/tags`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${base}/posts/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  const categories: MetadataRoute.Sitemap = getCategories().map(({ slug }) => ({
    url: `${base}/categories/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const tags: MetadataRoute.Sitemap = getTags().map(({ slug }) => ({
    url: `${base}/tags/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [...staticRoutes, ...posts, ...categories, ...tags];
}
