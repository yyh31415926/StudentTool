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

/**
 * 搜索工具的纯函数。
 *
 * 数据完全由调用方传入，命中范围来自工具定义自带的字段（name / summary /
 * keywords / tags / pinyin），不硬编码任何工具名称。空或纯空格的输入返回
 * 全部工具（保持传入顺序）；否则对每个字段做不区分大小写的包含匹配。
 */
export function searchTools(
  tools: readonly SearchableTool[],
  query: string,
): readonly SearchableTool[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return tools;
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
