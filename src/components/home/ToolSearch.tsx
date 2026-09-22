"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { searchTools, type SearchableTool } from "./search-tools";

type ToolSearchProps = {
  tools: readonly SearchableTool[];
};

/**
 * 首页搜索入口（唯一的客户端交互组件）。
 *
 * 输入为空时显示全部工具，输入内容时实时过滤；结果直接链接到工具页，
 * 不跳转到独立搜索页。匹配逻辑在 `search-tools.ts`（纯函数）中。
 */
export function ToolSearch({ tools }: ToolSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchTools(tools, query), [tools, query]);

  return (
    <div>
      <Input
        aria-label="搜索工具"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="搜索工具，如「进制」或 jz"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-2 max-h-72 overflow-y-auto rounded-card border border-border bg-surface shadow-card">
        {results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            没有找到匹配的工具，换个关键词试试。
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((tool) => (
              <li key={tool.id}>
                <Link
                  className="flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  href={`/tools/${tool.id}`}
                >
                  <span className="text-base font-medium text-foreground">
                    {tool.name}
                  </span>
                  {tool.summary ? (
                    <span className="text-sm text-muted-foreground">
                      {tool.summary}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
