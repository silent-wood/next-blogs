"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SearchDoc } from "@/lib/posts";

/**
 * 站内搜索：构建期生成 /search-index.json，这里在浏览器里做子串匹配。
 * 中文不做分词 —— 对这个量级的文章数，子串匹配已经足够，也最不容易出错。
 */
export function SearchClient() {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<SearchDoc[]>;
      })
      .then((data) => {
        if (!cancelled) setDocs(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!docs || keyword.length === 0) return [];
    return docs
      .map((doc) => {
        const haystack = [doc.title, doc.summary, doc.category, ...doc.tags, doc.text]
          .join("\n")
          .toLowerCase();
        const hits = haystack.split(keyword).length - 1;
        return { doc, hits };
      })
      .filter((item) => item.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 30)
      .map((item) => item.doc);
  }, [docs, query]);

  function highlight(text: string) {
    const keyword = query.trim();
    if (!keyword) return text;
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-chip text-ink">{text.slice(index, index + keyword.length)}</mark>
        {text.slice(index + keyword.length)}
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line-strong pb-3">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="7.6" cy="7.6" r="5.4" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M11.7 11.7L16 16"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、摘要、正文…"
          aria-label="搜索文章"
          className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-ghost"
        />
      </div>

      <div className="mt-6" aria-live="polite">
        {failed && (
          <p className="text-[13px] text-ink-muted">
            索引加载失败。请确认站点构建产物包含 /search-index.json。
          </p>
        )}

        {!failed && docs === null && (
          <p className="font-mono text-[11px] text-ink-ghost">正在载入索引…</p>
        )}

        {docs !== null && query.trim().length > 0 && results.length === 0 && (
          <p className="text-[13px] text-ink-muted">
            没有「{query.trim()}」相关的文章。换个更短的关键词试试。
          </p>
        )}

        {results.length > 0 && (
          <>
            <p className="font-mono text-[11px] text-ink-ghost">
              {results.length} 条结果
            </p>
            <ul className="mt-2 border-t border-line">
              {results.map((doc) => (
                <li key={doc.slug} className="border-b border-line py-5">
                  <h2 className="font-serif text-[18px] font-semibold text-ink">
                    <Link
                      href={`/posts/${doc.slug}`}
                      className="transition-opacity hover:opacity-75"
                    >
                      {highlight(doc.title)}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-[1.75] text-ink-muted">
                    {highlight(doc.summary)}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-ink-ghost">
                    {doc.date} · {doc.category}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
