import type { Metadata } from "next";
import { FavoriteToolsList } from "@/components/tools/FavoriteToolsList";
import type { ToolCardData } from "@/components/tools/ToolCard";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getAllTools } from "@/lib/tools/registry";

export function generateMetadata(): Metadata {
  return {
    title: "我的工具箱 | StudentTool",
    description: "查看收藏的工具，收藏数据保存在当前浏览器中。",
    alternates: { canonical: "/my-toolbox" },
    openGraph: {
      type: "website",
      url: "/my-toolbox",
      siteName: "StudentTool",
      locale: "zh_CN",
      title: "我的工具箱 | StudentTool",
      description: "查看收藏的工具，收藏数据保存在当前浏览器中。",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "StudentTool 学生数字工具工作台" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "我的工具箱 | StudentTool",
      description: "查看收藏的工具，收藏数据保存在当前浏览器中。",
      images: ["/og-image.png"],
    },
  };
}

export default function MyToolboxPage() {
  const tools = getAllTools();
  const toolData: readonly ToolCardData[] = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    summary: tool.summary,
  }));

  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <div className="w-full space-y-10">
        <Breadcrumbs items={[{ label: "首页", href: "/" }, { label: "我的工具箱" }]} />
        <div className="page-intro">
          <p className="text-sm font-medium text-muted-foreground">工具箱</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            我的工具箱
          </h1>
          <p className="mt-4 max-w-prose text-base text-muted-foreground">
            收藏、最近使用与继续上次。数据保存在本机浏览器。
          </p>
        </div>

        <FavoriteToolsList tools={toolData} />
      </div>
    </div>
  );
}
