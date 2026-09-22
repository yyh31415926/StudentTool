"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ToolFavoriteButton } from "@/components/tools/ToolFavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import type { ToolCardData } from "@/components/tools/ToolCard";

type FavoriteToolsSectionProps = {
  tools: readonly ToolCardData[];
};

export function FavoriteToolsSection({
  tools,
}: FavoriteToolsSectionProps) {
  const { favoriteIds, isLoaded } = useFavorites();
  const favoriteTools = favoriteIds
    .map((toolId) => tools.find((tool) => tool.id === toolId))
    .filter((tool): tool is ToolCardData => tool !== undefined);

  return (
    <section aria-labelledby="favorite-tools-heading">
      <div className="mb-4">
        <h2
          className="text-2xl font-semibold tracking-tight"
          id="favorite-tools-heading"
        >
          我的常用工具
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          收藏的工具会保存在当前浏览器中。
        </p>
      </div>

      {!isLoaded ? (
        <Card className="text-sm text-muted-foreground">正在读取收藏…</Card>
      ) : favoriteTools.length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          还没有收藏工具，可以在工具卡片上添加收藏。
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteTools.map((tool) => (
            <div className="relative" key={tool.id}>
              <Link
                className="block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                href={`/tools/${tool.id}`}
              >
                <Card className="flex h-full flex-col pr-28 transition-colors hover:border-focus">
                  <span className="w-fit rounded-control bg-surface-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {tool.category}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">
                    {tool.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {tool.description}
                  </p>
                </Card>
              </Link>
              <div className="absolute right-4 top-4">
                <ToolFavoriteButton toolId={tool.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
