"use client";
import { FavoriteToolsSection } from "./FavoriteToolsSection";
import type { ToolCardData } from "./ToolCard";
export function FavoriteToolsList({ tools }: { tools: readonly ToolCardData[] }) {
  return <FavoriteToolsSection tools={tools} full />;
}
