import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 纯静态导出：`next build` 直接产出 out/ 目录。
   * 换来的是「物理上可搬走」——Vercel / Cloudflare Pages / Netlify /
   * GitHub Pages / 对象存储 + CDN 都能直接托管，不需要任何适配器。
   *
   * 代价（本站都不需要）：
   * - 运行时图片优化（图片在提交前已压好）
   * - 运行时生成 OG 图（改为构建期或静态图）
   * - 路由内的服务端逻辑（搜索是构建期索引，评论走 Giscus）
   */
  output: "export",

  /** 静态导出下 next/image 的默认 loader 不可用，关闭优化，按原尺寸输出。 */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
