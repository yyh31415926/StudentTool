"use client";

import { ToolCard, type ToolCardData } from "@/components/tools/ToolCard";
import { Card } from "@/components/ui/Card";
import { useFavorites } from "@/hooks/useFavorites";

type FavoriteToolsListProps = {
  tools: readonly ToolCardData[];
};

/**
 * 我的工具箱的收藏列表（唯一客户端交互：读取收藏 id 并过滤）。
 *
 * 数据流：favoriteIds（收藏的工具 id）→ 用传入的 tools 过滤 → ToolCard。
 * 工具信息仍来自注册表（由页面以 props 传入），本组件不保存任何工具名称/描述。
 */
export function FavoriteToolsList({ tools }: FavoriteToolsListProps) {
  const { favoriteIds, isLoaded } = useFavorites();

  const favoriteTools = favoriteIds
    .map((toolId) => tools.find((tool) => tool.id === toolId))
    .filter((tool): tool is ToolCardData => tool !== undefined);

  if (!isLoaded) {
    return (
      <Card className="text-sm text-muted-foreground">正在读取收藏…</Card>
    );
  }

  if (favoriteTools.length === 0) {
    return (
      <Card className="text-sm text-muted-foreground">
        还没有收藏工具，可以在工具卡片上添加收藏。
      </Card>
    );
  }

  return (
    <section aria-labelledby="favorite-tools-heading">
      <div className="mb-4">
        <h2
          className="text-2xl font-semibold tracking-tight"
          id="favorite-tools-heading"
        >
          收藏工具
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {favoriteTools.length} 个收藏工具
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {favoriteTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
