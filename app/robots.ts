import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site.config";

/** 静态导出要求：构建期产出静态文件 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/search"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
