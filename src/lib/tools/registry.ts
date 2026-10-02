import type { ToolCategory, ToolDefinition } from "@/types/tools";
import { toolDefinitions } from "./definitions";

// Keep all discovery surfaces in the same editorial order from definitions.
const toolRegistry: readonly ToolDefinition[] = [...toolDefinitions].sort(
  (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
);

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
