"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { searchTools, type SearchableTool } from "./search-tools";

export function ToolSearch({ tools }: { tools: readonly SearchableTool[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const results = useMemo(() => searchTools(tools, query), [tools, query]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  function select(index: number) {
    const tool = results[index];
    if (!tool) return;
    setOpen(false);
    setQuery("");
    router.push(`/tools/${tool.id}`);
  }
  return <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
    <Input role="combobox" aria-label="搜索工具" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
      className="search-input" autoComplete="off" enterKeyHint="search" placeholder="搜索工具，如「进制」或 jz" value={query}
      onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { setOpen(false); return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          setActive((index) => !open ? 0 : results.length ? (index + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0);
        }
        if (event.key === "Enter" && open) { event.preventDefault(); select(active); }
      }} />
    {open && <div className="search-results">
      <ul ref={listRef} role="listbox" aria-label="匹配的工具" id={`${id}-results`}>
        {results.map((tool, index) => <li key={tool.id} id={`${id}-${index}`} role="option" aria-selected={active === index} className={`search-option ${active === index ? "is-active" : ""}`}
          onMouseDown={(event) => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => select(index)}>
          <span className="font-medium">{tool.name}</span><span className="block text-sm text-muted-foreground">{tool.summary}</span>
        </li>)}
      </ul>
      {results.length === 0 && <p role="status" className="p-4 text-muted-foreground">没有找到匹配的工具，换个关键词试试。</p>}
    </div>}
  </div>;
}
