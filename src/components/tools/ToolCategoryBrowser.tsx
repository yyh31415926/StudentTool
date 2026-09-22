"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ToolCard, type ToolCardData } from "@/components/tools/ToolCard";
import { getAvailableCategories } from "@/lib/tools/categories";
import type { ToolCategory } from "@/types/tools";

type ActiveCategory = ToolCategory | "all";

type ToolCategoryBrowserProps = {
  tools: readonly ToolCardData[];
};

type CategoryTab = {
  slug: ActiveCategory;
  name: string;
};

/**
 * 首页工具分类浏览区。
 *
 * 数据由服务端从注册表取好后以 props 传入；本组件只负责「分类切换」这一个
 * 客户端交互。分类 tab 由注册表派生（空分类不渲染），加工具后自动出现。
 */
export function ToolCategoryBrowser({ tools }: ToolCategoryBrowserProps) {
  const [activeCategory, setActiveCategory] =
    useState<ActiveCategory>("all");

  const tabs = useMemo<readonly CategoryTab[]>(() => {
    const allTab: CategoryTab = { slug: "all", name: "全部" };
    const categoryTabs: CategoryTab[] = getAvailableCategories(tools).map(
      (category) => ({ slug: category.slug, name: category.name }),
    );

    return [allTab, ...categoryTabs];
  }, [tools]);

  const visibleTools = useMemo(() => {
    if (activeCategory === "all") {
      return tools;
    }
    return tools.filter((tool) => tool.category === activeCategory);
  }, [tools, activeCategory]);

  return (
    <div>
      <div
        aria-label="按分类筛选工具"
        className="mb-4 flex flex-wrap gap-2"
        role="group"
      >
        {tabs.map((tab) => {
          const active = tab.slug === activeCategory;

          return (
            <Button
              aria-pressed={active}
              key={tab.slug}
              size="sm"
              type="button"
              variant={active ? "primary" : "secondary"}
              onClick={() => setActiveCategory(tab.slug)}
            >
              {tab.name}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
