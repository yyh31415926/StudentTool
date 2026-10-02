import type { ToolCategory } from "@/types/tools";
const symbols: Record<ToolCategory, string> = { convert: "⇄", text: "Aa", dev: "</>" };
export function ToolIcon({ category }: { category: ToolCategory }) {
  return <span aria-hidden="true" className={`tool-icon tool-icon-${category}`}>{symbols[category]}</span>;
}

