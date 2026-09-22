import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createElement } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { ToolFavoriteButton } from "@/components/tools/ToolFavoriteButton";
import { getTemplateComponent } from "@/components/tools/templates/registry";
import { Card } from "@/components/ui/Card";
import { getAllCategories } from "@/lib/tools/categories";
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
    description: tool.summary ?? tool.description,
    keywords: tool.keywords ? [...tool.keywords] : undefined,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId } = await params;
  const tool = getToolById(toolId);

  if (!tool) {
    notFound();
  }

  const Template = getTemplateComponent(tool.template);
  const category = getAllCategories().find((item) => item.slug === tool.category);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "首页", href: "/" },
    ...(category
      ? [{ label: category.name, href: `/categories/${tool.category}` }]
      : []),
    { label: tool.name },
  ];

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-6">
        <Breadcrumbs items={breadcrumbItems} />

        <Card className="w-full">
          <p className="text-sm font-medium text-muted-foreground">工具</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {tool.name}
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            {tool.description}
          </p>
        </Card>
        {Template
          ? createElement(Template, {
              toolId: tool.id,
              exampleInput: tool.exampleInput,
              emptyHint: tool.emptyHint,
              errorHint: tool.errorHint,
            })
          : null}

        <div className="flex justify-end">
          <ToolFavoriteButton toolId={tool.id} />
        </div>

        {tool.tip ? (
          <Card>
            <h2 className="text-sm font-semibold">小技巧</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tool.tip}</p>
          </Card>
        ) : null}

        {tool.seoFaq && tool.seoFaq.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: tool.seoFaq.map((faq) => ({
                  "@type": "Question",
                  name: faq.question,
                  acceptedAnswer: { "@type": "Answer", text: faq.answer },
                })),
              }),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
