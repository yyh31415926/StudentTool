import type { ToolDefinition } from "@/types/tools";
import { charCountTool } from "./char-count";
import { unitConvertTool } from "./unit-convert";

export const toolDefinitions = [
  charCountTool,
  unitConvertTool,
] satisfies readonly ToolDefinition[];
