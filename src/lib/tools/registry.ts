import type { ToolCategory, ToolDefinition } from "@/types/tools";
import { toolDefinitions } from "./definitions";

const toolRegistry: readonly ToolDefinition[] = toolDefinitions;

export function getAllTools(): readonly ToolDefinition[] {
  return toolRegistry;
}

export function getToolById(id: string): ToolDefinition | undefined {
  return toolRegistry.find((tool) => tool.id === id);
}

export function getToolsByCategory(
  category: ToolCategory,
): readonly ToolDefinition[] {
  return toolRegistry.filter((tool) => tool.category === category);
}
