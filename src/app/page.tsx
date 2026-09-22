import { FavoriteToolsSection } from "@/components/tools/FavoriteToolsSection";
import { ToolCategoryBrowser } from "@/components/tools/ToolCategoryBrowser";
import { Card } from "@/components/ui/Card";
import { getAllTools } from "@/lib/tools/registry";

export default function Home() {
  const tools = getAllTools();
  const toolSummaries = tools.map(({ id, name, description, category }) => ({
    id,
    name,
    description,
    category,
  }));

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-10">
        <Card className="w-full">
          <p className="text-sm font-medium text-muted-foreground">
            学生数字工具工作台
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            StudentTool
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            打开就能用，用完不用管。选择一个工具开始处理手头的任务。
          </p>
        </Card>

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
