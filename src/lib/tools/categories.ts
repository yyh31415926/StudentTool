import type { ToolCategory, ToolDefinition } from "@/types/tools";

export type CategoryOption = {
  slug: ToolCategory;
  name: string;
};

/**
 * 全站分类的单一数据源。
 *
 * 分类是产品定案（v0.2 §3.1）：转换工具 / 文本处理 / 开发辅助。
 * 此处仅承载「slug → 中文名」映射与空分类过滤，不包含任何工具列表，
 * 因此不违反「工具信息统一来自注册表」的红线。
 */
export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { slug: "convert", name: "转换工具" },
  { slug: "text", name: "文本处理" },
  { slug: "dev", name: "开发辅助" },
];

/**
 * 返回「当前有工具」的分类（按 CATEGORY_OPTIONS 声明顺序）。
 *
 * v0.2 §3.1：工具数不足的分类直接不渲染（不允许出现空分类）。
 * 新增工具后，对应分类会自动出现在这里，无需改动首页或组件。
 */
export function getAvailableCategories(
  tools: readonly Pick<ToolDefinition, "category">[],
): readonly CategoryOption[] {
  return CATEGORY_OPTIONS.filter((option) =>
    tools.some((tool) => tool.category === option.slug),
  );
}
