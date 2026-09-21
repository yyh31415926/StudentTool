import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { CounterTemplate } from "@/components/tools/templates/CounterTemplate";
import { getAllTools, getToolById } from "@/lib/tools/registry";

type ToolPageProps = {
  params: Promise<{ toolId: string }>;
};

export function generateStaticParams() {
  return getAllTools().map((tool) => ({ toolId: tool.id }));
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { toolId } = await params;
  const tool = getToolById(toolId);

  if (!tool) {
    return {};
  }

  return {
    title: `${tool.name} | StudentTool`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId } = await params;
  const tool = getToolById(toolId);

  if (!tool) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-6">
        <Card className="w-full">
          <p className="text-sm font-medium text-muted-foreground">工具</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {tool.name}
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            {tool.description}
          </p>
        </Card>
        {tool.template === "counter" ? (
          <CounterTemplate exampleInput={tool.exampleInput} />
        ) : null}
      </div>
    </div>
  );
}
