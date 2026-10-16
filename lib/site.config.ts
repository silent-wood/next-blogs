/**
 * 站点级配置 —— 对应原「后台 · 站点设置」模块。
 * 全部为源码常量，不依赖后台与数据库；改这里 → 提交 → 自动部署。
 */

export const siteConfig = {
  name: "不系舟",
  tagline: "写代码，也写天气",
  description:
    "李顺的个人博客。写技术笔记、生活碎片，和一些还没想清楚的问题——没有算法，没有广告，只有一个安静的阅读角落。",
  /** 站点主域名。部署到 Vercel 后在环境变量里覆盖为真实域名。 */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://next-blogs-beryl.vercel.app",
  locale: "zh-CN",
  since: 2019,

  author: {
    name: "李顺",
    initials: "李",
    email: "silencewood@163.com",
    github: "https://github.com/silent-wood",
    /** 关于页「联系」卡片，按需增删 */
    links: [
      { label: "邮箱", value: "silencewood@163.com", href: "" },
      {
        label: "GitHub",
        value: "github.com/silent-wood",
        href: "https://github.com/silent-wood",
      },
    ],
  },

  /**
   * 导航。hidden 的项不出现在主导航，但路由仍然存在（可被搜索与索引）。
   * 移动端折叠菜单使用同一份数据。
   */
  nav: [
    { label: "首页", href: "/" },
    { label: "归档", href: "/archive" },
    { label: "分类", href: "/categories" },
    { label: "标签", href: "/tags" },
    { label: "关于", href: "/about" },
  ],

  /** 首页每页文章数，超出的部分在 /archive 查看 */
  postsOnHome: 6,

  /**
   * 邮件订阅：静态站自身收不了邮箱，必须接第三方服务。
   * 填写 provider 后订阅卡片自动生效；留空则渲染为说明态。
   * 例：provider: "buttondown", action: "https://buttondown.email/api/emails/embed-subscribe/xxx"
   */
  newsletter: {
    provider: "" as "" | "buttondown" | "mailchimp" | "custom",
    action: "",
    note: "",
    placeholder: "your@email.com",
  },

  /**
   * 评论：Giscus（基于 GitHub Discussions），无后端、无自建账号体系。
   * 到 https://giscus.app 生成下列四项后填入即可激活；留空则渲染说明占位。
   */
  giscus: {
    repo: "",
    repoId: "",
    category: "",
    categoryId: "",
  },

  /** 第三方统计，留空则不注入任何脚本（默认保护读者隐私） */
  analytics: {
    provider: "" as "" | "vercel" | "umami" | "plausible",
    scriptUrl: "",
    websiteId: "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
