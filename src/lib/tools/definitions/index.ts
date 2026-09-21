import type { ToolDefinition } from "@/types/tools";
import { mockTool } from "./mock-tool";

export const toolDefinitions = [mockTool] satisfies readonly ToolDefinition[];
