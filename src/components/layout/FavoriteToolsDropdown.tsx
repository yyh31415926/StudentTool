"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { ToolIcon } from "@/components/ui/ToolIcon";
import type { ToolDefinition } from "@/types/tools";

type FavoriteTool = Pick<ToolDefinition, "id" | "name" | "category">;

export function FavoriteToolsDropdown({ tools }: { tools: readonly FavoriteTool[] }) {
  const { favoriteIds, isLoaded } = useFavorites();
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<"first" | "last" | null>(null);
  const favorites = favoriteIds.flatMap((favoriteId) => {
    const tool = tools.find(({ id }) => id === favoriteId);
    return tool ? [tool] : [];
  });

  useEffect(() => {
    if (!open) return;
    const links = panelRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    if (links?.length && pendingFocus.current) {
      links[pendingFocus.current === "first" ? 0 : links.length - 1].focus();
      pendingFocus.current = null;
    }
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        pendingFocus.current = null;
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, isLoaded, favorites.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      pendingFocus.current = null;
      buttonRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    if (!open && (event.key === "Home" || event.key === "End")) return;
    event.preventDefault();
    if (!open) {
      pendingFocus.current = event.key === "ArrowDown" ? "first" : "last";
      setOpen(true);
      return;
    }
    const links = Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    if (!links.length) return;
    const current = links.findIndex((link) => link === document.activeElement);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? links.length - 1
      : current < 0 ? (event.key === "ArrowDown" ? 0 : links.length - 1)
      : (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
    links[next].focus();
  }

  return <div ref={rootRef} className="relative" onKeyDown={handleKeyDown}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
        pendingFocus.current = null;
      }
    }}>
    <button ref={buttonRef} type="button" className="nav-link" aria-expanded={open} aria-controls={id}
      onClick={() => { pendingFocus.current = null; setOpen((value) => !value); }}>
      收藏工具
    </button>
    {open && <div ref={panelRef} id={id} className="search-results favorites-dropdown" role="region" aria-label="收藏的工具">
      {!isLoaded ? <div role="status" aria-label="正在读取收藏" className="p-4"><div className="skeleton" /></div>
        : favorites.length === 0 ? <p role="status" className="p-4 text-muted-foreground">还没有收藏工具，点击工具卡片上的星标添加。</p>
        : <ul>{favorites.map((tool) => <li key={tool.id}>
          <Link className="favorite-option" href={`/tools/${tool.id}`} onClick={() => setOpen(false)}>
            <ToolIcon category={tool.category} />
            <span className="font-medium">{tool.name}</span>
          </Link>
        </li>)}</ul>}
    </div>}
  </div>;
}
