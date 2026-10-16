/**
 * 标签 / 分类的 URL 标识（slug）
 *
 * 为什么需要它
 * ------------
 * 本站是静态导出（next.config.ts 里 output: "export"）。在这个模式下，动态路由
 * 参数在 dev 服务器里是以「百分号编码」形式交给页面的，而 generateStaticParams()
 * 产出的是原始字符串。只要参数里出现「编码前后不一致」的字符（中文、空格），
 * dev 就会判定 "generateStaticParams() 缺参数"（错误码 E443）并让页面 404。
 *
 * 实测：/tags/Vite → 200；/tags/算法（%E7%AE%97%E6%B3%95）→ 404。
 * 注意 next build 不受影响（产出的 out/tags/算法.html 仍可被静态服务器正常解码访问），
 * 所以这是「dev 与构建行为不一致」的坑，不是内容层的问题。
 *
 * 解法
 * ----
 * 路由参数一律用 ASCII slug，显示名继续用原始中文：
 *   /tags/algorithm  ↔  标签「算法」
 *
 * 规则：
 * - 纯 ASCII 名称自动生成 slug（小写、非字母数字转 -）
 * - 含非 ASCII 的名称必须在下表登记，否则直接抛错——宁可构建失败，
 *   也不要产出打不开的链接
 * - 同一命名空间（标签 / 分类各自）内 slug 必须唯一，重复同样抛错
 */

/** 词条 → slug。非 ASCII 词条必须登记；ASCII 词条只在自动结果会撞车时才登记。 */
const SLUGS: Record<string, string> = {
  // —— 分类 ——
  工程化: "engineering",
  技术: "tech",
  随笔: "essay",

  // —— 标签 ——
  事件: "event",
  事件循环: "event-loop",
  优化: "optimization",
  写作: "writing",
  前端架构: "frontend-architecture",
  响应式: "responsive",
  备份: "backup",
  插件: "plugin",
  浏览器: "browser",
  渲染原理: "rendering",
  源码: "source-code",
  独立站点: "indie-site",
  生命周期: "lifecycle",
  组件: "component",
  组件库: "component-library",
  网络: "network",
  长期主义: "long-termism",

  /** 「算法」同时用作分类与标签，共用一条即可（两条路由各自独立） */
  算法: "algorithm",

  /**
   * ASCII 词条的显式覆盖：自动结果是 "plugin"，会和中文「插件」撞车。
   * 「插件」保留通用名 plugin，「Plugin」特指 webpack 的 Plugin 机制。
   */
  Plugin: "webpack-plugin",
};

/** 可打印 ASCII 之外的字符（中文、全角标点、空白符等） */
const HAS_NON_ASCII = /[^\x20-\x7E]/;

/**
 * 把词条名转成 URL 安全的 ASCII 标识。
 * 未登记且含非 ASCII 字符时抛错，避免静默产出不可访问的链接。
 */
export function slugifyTaxon(name: string): string {
  const mapped = SLUGS[name];
  if (mapped) return mapped;

  if (HAS_NON_ASCII.test(name)) {
    throw new Error(
      `[taxonomy] 「${name}」含非 ASCII 字符，必须在 lib/taxonomy.ts 的 SLUGS 中登记 slug。`,
    );
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(
      `[taxonomy] 无法为「${name}」自动生成 slug，请在 lib/taxonomy.ts 的 SLUGS 中登记。`,
    );
  }
  return slug;
}
