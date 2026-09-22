import type { ToolDefinition } from "@/types/tools";
import { baseConvertTool } from "./base-convert";
import { base64Tool } from "./base64";
import { charCountTool } from "./char-count";
import { unitConvertTool } from "./unit-convert";
import { urlEncodeTool } from "./url-encode";

export const toolDefinitions = [
  charCountTool,
  unitConvertTool,
  baseConvertTool,
  base64Tool,
  urlEncodeTool,
] satisfies readonly ToolDefinition[];
