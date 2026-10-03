"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import type { CategoryOption } from "@/lib/tools/categories";
import {
  resolveSearchView,
  searchTools,
  type SearchableTool,
} from "./search-tools";

export type ToolSearchProps = {
  /** 可搜索的工具，来自工具注册表（单一数据源）。 */
  tools: readonly SearchableTool[];
  /** 空关键词时显示的分类入口，来自统一分类数据源（单一数据源）。 */
  categories: readonly CategoryOption[];
};

export function ToolSearch({ tools, categories }: ToolSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const view = resolveSearchView(query);
  const results = useMemo(() => searchTools(tools, query), [tools, query]);
  const options = view === "categories" ? categories : results;
  const active = view === "categories" ? activeCategory : activeTool;
  const activeOption = options[active];
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  function resetActive() {
    setActiveTool(0);
    setActiveCategory(0);
  }
  function select(index: number) {
    if (view === "categories") {
      const category = categories[index];
      if (!category) return;
      setOpen(false);
      router.push(`/categories/${category.slug}`);
      return;
    }
    const tool = results[index];
    if (!tool) return;
    setOpen(false);
    setQuery("");
    router.push(`/tools/${tool.id}`);
  }
  return <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
    <Input role="combobox" aria-label="搜索工具" aria-autocomplete="list" aria-expanded={open && Boolean(activeOption)} aria-controls={`${id}-results`} aria-activedescendant={open && activeOption ? `${id}-${active}` : undefined}
      className="search-input" autoComplete="off" enterKeyHint="search" placeholder="搜索工具，如「进制」或 jz" value={query}
      onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); resetActive(); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { setOpen(false); return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          const step = event.key === "ArrowDown" ? 1 : -1;
          const move = (index: number) => options.length ? (index + step + options.length) % options.length : 0;
          if (view === "categories") setActiveCategory((index) => !open ? 0 : move(index));
          else setActiveTool((index) => !open ? 0 : move(index));
        }
        if (event.key === "Enter" && open) { event.preventDefault(); select(active); }
      }} />
    {open && <div className="search-results">
      <ul ref={listRef} role="listbox" aria-label={view === "categories" ? "工具分类" : "匹配的工具"} id={`${id}-results`}>
        {view === "categories"
          ? categories.map((category, index) => <li key={category.slug} id={`${id}-${index}`} role="option" aria-selected={activeCategory === index} className={`search-option ${activeCategory === index ? "is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()} onMouseMove={() => setActiveCategory(index)} onClick={() => select(index)}>
            <span className="font-medium">{category.name}</span><span className="block text-sm text-muted-foreground">{category.description}</span>
          </li>)
          : results.map((tool, index) => <li key={tool.id} id={`${id}-${index}`} role="option" aria-selected={activeTool === index} className={`search-option ${activeTool === index ? "is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()} onMouseMove={() => setActiveTool(index)} onClick={() => select(index)}>
            <span className="font-medium">{tool.name}</span><span className="block text-sm text-muted-foreground">{tool.summary}</span>
          </li>)}
      </ul>
      {view === "tools" && results.length === 0 && <p role="status" className="p-4 text-muted-foreground">没有找到匹配的工具，换个关键词试试。</p>}
      {view === "categories" && categories.length === 0 && <p role="status" className="p-4 text-muted-foreground">暂时没有可浏览的分类。</p>}
    </div>}
  </div>;
}
