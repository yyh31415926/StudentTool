import type { ToolDefinition } from "@/types/tools";

export const mockTool: ToolDefinition = {
  id: "mock-tool",
  name: "示例工具",
  category: "dev",
  description: "用于验证工具注册表与动态路由的占位工具。",
  template: "placeholder",
  run: (input: unknown): unknown => input,
};
