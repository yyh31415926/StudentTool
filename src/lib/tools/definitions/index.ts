import type { ToolDefinition } from "@/types/tools";
import { baseConvertTool } from "./base-convert";
import { base64Tool } from "./base64";
import { charCountTool } from "./char-count";
import { unitConvertTool } from "./unit-convert";

export const toolDefinitions = [
  charCountTool,
  unitConvertTool,
  baseConvertTool,
  base64Tool,
] satisfies readonly ToolDefinition[];
