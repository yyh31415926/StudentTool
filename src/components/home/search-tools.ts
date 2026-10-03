import type { ToolDefinition } from "@/types/tools";

/**
 * 搜索所需的最小工具字段集合。
 *
 * 从注册表派生的纯数据对象，不含 `run` 函数，因此可以安全地作为 props
 * 传入客户端组件（服务端组件 → 客户端组件的 props 必须可序列化）。
 */
export type SearchableTool = Pick<
  ToolDefinition,
  "id" | "name" | "category" | "summary" | "keywords" | "tags" | "pinyin"
>;

/** 顶部搜索下拉的两种形态：空关键词显示分类入口，非空关键词显示匹配工具。 */
export type SearchViewMode = "categories" | "tools";

/**
 * 归一化搜索关键词（纯函数）。
 *
 * 去首尾空白后转小写，保证"纯空格"与"空关键词"走同一条分支；
 * 不区分大小写，与 v0.2 §5.1 的匹配规则一致。
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * 依据关键词决定下拉内容（纯函数）。
 *
 * v0.2 §5.1（2026-10-03 定案）：关键词为空（含纯空格）→ 分类入口；
 * 非空 → 匹配工具。同一时刻只有一种内容，不混排、不回退到全部工具。
 */
export function resolveSearchView(query: string): SearchViewMode {
  return normalizeSearchQuery(query) === "" ? "categories" : "tools";
}

/**
 * 搜索工具的纯函数。
 *
 * 数据完全由调用方传入，命中范围来自工具定义自带的字段（name / summary /
 * keywords / tags / pinyin），不硬编码任何工具名称。空或纯空格的输入返回
 * 空结果——空关键词时下拉显示的是分类入口，不是全部工具（v0.2 §5.1）；
 * 否则对每个字段做不区分大小写的包含匹配，并保持传入顺序。
 */
export function searchTools(
  tools: readonly SearchableTool[],
  query: string,
): readonly SearchableTool[] {
  const normalized = normalizeSearchQuery(query);
  if (normalized === "") {
    return [];
  }

  return tools.filter((tool) => {
    const fields: readonly (string | undefined)[] = [
      tool.name,
      tool.summary,
      tool.pinyin,
      ...(tool.keywords ?? []),
      ...(tool.tags ?? []),
    ];

    return fields.some(
      (field) =>
        typeof field === "string" &&
        field.toLowerCase().includes(normalized),
    );
  });
}
