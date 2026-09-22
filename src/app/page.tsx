import { Hero } from "@/components/home/Hero";
import type { SearchableTool } from "@/components/home/search-tools";
import { FavoriteToolsSection } from "@/components/tools/FavoriteToolsSection";
import { ToolCategoryBrowser } from "@/components/tools/ToolCategoryBrowser";
import { getAllTools } from "@/lib/tools/registry";

export default function Home() {
  const tools = getAllTools();
  const toolSummaries = tools.map(({ id, name, description, category }) => ({
    id,
    name,
    description,
    category,
  }));
  const searchableTools: readonly SearchableTool[] = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    category: tool.category,
    summary: tool.summary,
    keywords: tool.keywords,
    tags: tool.tags,
    pinyin: tool.pinyin,
  }));

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-10">
        <Hero tools={searchableTools} />

        <FavoriteToolsSection tools={toolSummaries} />

        <section aria-labelledby="all-tools-heading">
          <div className="mb-4">
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="all-tools-heading"
            >
              全部工具
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              当前可用的学生数字工具，可按分类浏览。
            </p>
          </div>

          <ToolCategoryBrowser tools={toolSummaries} />
        </section>
      </div>
    </div>
  );
}
