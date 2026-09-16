import { Marked, Renderer, type Tokens } from "marked";

export type TocItem = {
  id: string;
  text: string;
  depth: number;
};

export type RenderedMarkdown = {
  html: string;
  toc: TocItem[];
};

/** 生成稳定的标题锚点 id（保留中文，去掉标点与空白，重复时追加序号） */
function slugifyHeading(text: string, used: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section";

  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen}`;
}

/** 去掉标题里的行内 Markdown 记号，得到纯文本（用于目录） */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const marked = new Marked({ gfm: true, breaks: false });

/**
 * 把 Markdown 渲染为 HTML，并抽出 h2 / h3 目录。
 *
 * 目录与正文共用同一套标题 id（构建期先扫一遍 token 赋 id，
 * 渲染时按 token 取回），保证两边的锚点永远一致。
 */
export function renderMarkdown(markdown: string): RenderedMarkdown {
  const tokens = marked.lexer(markdown);
  const used = new Map<string, number>();
  const headingIds = new WeakMap<object, string>();
  const toc: TocItem[] = [];

  for (const token of tokens) {
    if (token.type !== "heading") continue;
    const heading = token as Tokens.Heading;
    if (heading.depth < 2 || heading.depth > 3) continue;

    const text = stripInlineMarkdown(heading.text);
    const id = slugifyHeading(text, used);
    headingIds.set(heading, id);
    toc.push({ id, text, depth: heading.depth });
  }

  class EditorialRenderer extends Renderer {
    override heading(token: Tokens.Heading): string {
      const text = this.parser.parseInline(token.tokens);
      const id =
        headingIds.get(token) ??
        slugifyHeading(stripInlineMarkdown(token.text), used);
      const tag = `h${token.depth}`;
      return `<${tag} id="${id}">${text}</${tag}>\n`;
    }

    override code({ text, lang }: Tokens.Code): string {
      const language = (lang ?? "").split(/\s+/)[0] ?? "";
      const cls = language ? ` class="language-${language}"` : "";
      // 结构在构建期就定下来（语言标签 + 复制按钮），
      // 客户端只为 [data-copy] 挂一次事件委托，不做 DOM 改写。
      return (
        `<div class="code-block">` +
        `<div class="code-block-head">` +
        `<span class="code-lang">${language || "text"}</span>` +
        `<button type="button" class="code-copy" data-copy>复制</button>` +
        `</div>` +
        `<pre><code${cls}>${escapeHtml(text)}</code></pre>` +
        `</div>\n`
      );
    }
  }

  const html = marked.parser(tokens, { renderer: new EditorialRenderer() });

  return { html, toc };
}

/** 抽掉 Markdown 记号，得到用于全文搜索索引的纯文本 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
