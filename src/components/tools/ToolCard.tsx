import { ToolFavoriteButton } from "@/components/tools/ToolFavoriteButton";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { ToolDefinition } from "@/types/tools";

export type ToolCardData = Pick<
  ToolDefinition,
  "id" | "name" | "description" | "category"
>;

type ToolCardProps = {
  tool: ToolCardData;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <div className="relative">
      <Link
        className="block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        href={`/tools/${tool.id}`}
      >
        <Card className="flex h-full flex-col pr-28 transition-colors hover:border-focus">
          <span className="w-fit rounded-control bg-surface-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {tool.category}
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            {tool.name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {tool.description}
          </p>
        </Card>
      </Link>
      <div className="absolute right-4 top-4">
        <ToolFavoriteButton toolId={tool.id} />
      </div>
    </div>
  );
}
