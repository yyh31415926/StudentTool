import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/tools/ToolCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getAllCategories, getToolsByCategory } from "@/lib/tools/categories";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * 由分类数据层派生所有分类页的静态参数，零硬编码 slug。
 */
export function generateStaticParams() {
  return getAllCategories().map((category) => ({ slug: category.slug }));
}

/**
 * 分类页 SEO 元信息，全部来自分类数据，不硬编码名称/描述。
 */
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getAllCategories().find((item) => item.slug === slug);

  if (!category) {
    return {};
  }

  return {
    title: `${category.name} | StudentTool`,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      type: "website",
      url: `/categories/${category.slug}`,
      siteName: "StudentTool",
      locale: "zh_CN",
      title: `${category.name} | StudentTool`,
      description: category.description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "StudentTool 学生数字工具工作台" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | StudentTool`,
      description: category.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getAllCategories().find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const tools = getToolsByCategory(slug);

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-10">
        <Breadcrumbs items={[{ label: "首页", href: "/" }, { label: category.name }]} />
        <div className="page-intro">
          <p className="text-sm font-medium text-muted-foreground">分类</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {category.name}
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            {category.description}
          </p>
        </div>

        <section aria-labelledby="category-tools-heading">
          <div className="mb-4">
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="category-tools-heading"
            >
              工具列表
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              共 {category.count} 个工具
            </p>
          </div>

          <div className="tool-grid">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
