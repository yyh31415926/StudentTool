import type { ToolDefinition } from "@/types/tools";
import { baseConvertTool } from "./base-convert";
import { charCountTool } from "./char-count";
import { unitConvertTool } from "./unit-convert";

export const toolDefinitions = [
  charCountTool,
  unitConvertTool,
  baseConvertTool,
] satisfies readonly ToolDefinition[];
