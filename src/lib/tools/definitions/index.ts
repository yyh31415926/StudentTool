import type { ToolDefinition } from "@/types/tools";
import { charCountTool } from "./char-count";

export const toolDefinitions = [charCountTool] satisfies readonly ToolDefinition[];
