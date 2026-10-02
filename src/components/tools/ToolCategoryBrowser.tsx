import { ToolCard, type ToolCardData } from "./ToolCard";

/** Registry order stays stable; category navigation lives above the toolbox. */
export function ToolCategoryBrowser({ tools }: { tools: readonly ToolCardData[] }) {
  return <div className="tool-grid">{tools.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div>;
}
