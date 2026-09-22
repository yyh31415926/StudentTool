import type { ToolCategory, ToolDefinition } from "@/types/tools";
import { getAllTools } from "./registry";

export type CategoryOption = {
  slug: ToolCategory;
  name: string;
  description: string;
};

/**
 * 全站分类的单一数据源。
 *
 * 分类是产品定案（v0.2 §3.1）：转换工具 / 文本处理 / 开发辅助。
 * 此处承载「slug → 中文名 / 描述」映射（分类中文名与描述的集中管理，
 * 禁止在别处散落 `if (category === "convert")` 之类的判断），
 * 不包含任何工具列表，因此不违反「工具信息统一来自注册表」的红线。
 */
export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { slug: "convert", name: "转换工具", description: "把一种格式变成另一种" },
  { slug: "text", name: "文本处理", description: "和文字打交道" },
  {
    slug: "dev",
    name: "开发辅助",
    description: "写代码、处理数据结构时用",
  },
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

/**
 * 分类的完整数据（含工具），供分类页等场景使用。
 */
export type Category = {
  slug: ToolCategory;
  name: string;
  description: string;
  count: number;
  tools: readonly ToolDefinition[];
};

/**
 * 返回全部分类（含 count 与 tools），按 CATEGORY_OPTIONS 声明顺序。
 *
 * 数据完全由 getAllTools() 派生：slug / name / description 来自集中映射
 * CATEGORY_OPTIONS，tools 由 category 字段过滤得到，count 为 tools 长度。
 * 零硬编码工具 id。
 * 与 getAvailableCategories 的区别：本函数返回「所有分类」（含 count 为 0 的），
 * 供需要完整分类维度的场景（如 /categories/[slug]）使用。
 */
export function getAllCategories(): readonly Category[] {
  const tools = getAllTools();

  return CATEGORY_OPTIONS.map((option) => {
    const categoryTools = tools.filter((tool) => tool.category === option.slug);

    return {
      slug: option.slug,
      name: option.name,
      description: option.description,
      count: categoryTools.length,
      tools: categoryTools,
    };
  });
}

/**
 * 根据分类 slug 返回工具列表。
 *
 * 供动态路由 /categories/[slug] 使用：slug 来自 URL，可能是任意字符串，
 * 未知 slug 安全返回空数组，不抛异常。
 */
export function getToolsByCategory(slug: string): readonly ToolDefinition[] {
  return getAllTools().filter((tool) => tool.category === slug);
}
