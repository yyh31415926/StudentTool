"use client";

import { Button } from "@/components/ui/Button";
import { useFavorites } from "@/hooks/useFavorites";

type ToolFavoriteButtonProps = {
  toolId: string;
};

export function ToolFavoriteButton({ toolId }: ToolFavoriteButtonProps) {
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
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleFavorite(toolId);
        }}
      >
        {active ? "已收藏" : "收藏"}
      </Button>
      {error ? (
        <span
          className="max-w-40 text-right text-xs text-red-700 dark:text-red-300"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
