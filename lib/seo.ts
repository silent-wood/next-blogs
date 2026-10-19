import type { Metadata } from "next";

type Alternates = NonNullable<Metadata["alternates"]>;

/**
 * 统一的 `alternates` 构造器。
 *
 * 为什么需要它：Next.js 的 metadata 是**浅合并**——页面里一旦写了 `alternates`，
 * 就会整体覆盖根布局的同名字段，`types` 里的 RSS 自动发现链接随之丢失。
 * 所以每个页面都必须把 `canonical` 和 `types` 一起声明。
 *
 * 用法：`alternates: alternatesFor("/about")`
 */
export function alternatesFor(canonical: string): Alternates {
  return {
    canonical,
    types: { "application/rss+xml": "/rss.xml" },
  };
}
