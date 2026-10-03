import { Hero } from "@/components/home/Hero";
import { FavoriteToolsSection } from "@/components/tools/FavoriteToolsSection";
import { ToolCategoryBrowser } from "@/components/tools/ToolCategoryBrowser";
import { getAllTools } from "@/lib/tools/registry";
export default function Home() {
  const tools = getAllTools();
  const toolSummaries = tools.map(({ id, name, description, category, summary }) => ({ id, name, description, category, summary }));
  return <div className="home-page mx-auto w-full max-w-content px-page md:px-page-lg">
    <Hero />
    <FavoriteToolsSection tools={toolSummaries} />
    <section aria-labelledby="all-tools-heading" id="all-tools" className="pb-12">
      <div className="section-heading"><div><h2 id="all-tools-heading" className="text-xl font-semibold">常用工具</h2><p className="mt-1 text-sm text-muted-foreground">从日常学习到数据处理，找到顺手的那个。</p></div><span className="text-sm text-muted-foreground">{tools.length} 个工具</span></div>
      <ToolCategoryBrowser tools={toolSummaries} />
    </section>
  </div>;
}
