import Link from "next/link";
import { ToolFavoriteButton } from "./ToolFavoriteButton";
import { ToolIcon } from "@/components/ui/ToolIcon";
import { CATEGORY_OPTIONS } from "@/lib/tools/categories";
import type { ToolDefinition } from "@/types/tools";
export type ToolCardData = Pick<ToolDefinition, "id" | "name" | "description" | "category" | "summary">;
export function ToolCard({ tool }: { tool: ToolCardData }) {
  const category = CATEGORY_OPTIONS.find((item) => item.slug === tool.category);
  return <article className="tool-card">
    <Link className="tool-card-link" href={`/tools/${tool.id}`}>
      <ToolIcon category={tool.category} />
      <h3 className="mt-4 font-semibold text-xl">{tool.name}</h3>
      <p className="mt-2 text-muted-foreground tool-summary">{tool.summary ?? tool.description}</p>
      <span className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>{category?.name}</span><span aria-hidden="true">↗</span></span>
    </Link>
    <div className="absolute right-3 top-3"><ToolFavoriteButton toolId={tool.id} compact /></div>
  </article>;
}
