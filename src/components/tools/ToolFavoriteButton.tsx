"use client";

import { Button } from "@/components/ui/Button";
import { useFavorites } from "@/hooks/useFavorites";

type ToolFavoriteButtonProps = {
  toolId: string;
  compact?: boolean;
};

export function ToolFavoriteButton({ toolId, compact = false }: ToolFavoriteButtonProps) {
  const { error, isFavorite, isLoaded, toggleFavorite } = useFavorites();
  const active = isFavorite(toolId);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        aria-label={active ? "取消收藏" : "收藏工具"}
        aria-pressed={active}
        disabled={!isLoaded}
        size="sm"
        type="button"
        variant={active ? "primary" : "secondary"}
        className={compact ? "favorite-compact" : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleFavorite(toolId);
        }}
      >
        {compact ? <span aria-hidden="true">{active ? "★" : "☆"}</span> : active ? "已收藏" : "收藏"}
      </Button>
      {error ? (
        <span
          className="max-w-40 rounded-control bg-surface p-1 text-right text-sm text-error"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
