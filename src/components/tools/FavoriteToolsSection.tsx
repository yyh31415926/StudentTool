"use client";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentTools } from "@/hooks/useRecentTools";
import { ToolCard, type ToolCardData } from "./ToolCard";

export function FavoriteToolsSection({ tools, full = false }: { tools: readonly ToolCardData[]; full?: boolean }) {
  const { favoriteIds, isLoaded } = useFavorites();
  const { recent, isLoaded: recentLoaded } = useRecentTools();
  const favorites = favoriteIds.map((id) => tools.find((tool) => tool.id === id)).filter((tool): tool is ToolCardData => Boolean(tool));
  const recentTools = recent.map(({ id }) => tools.find((tool) => tool.id === id)).filter((tool): tool is ToolCardData => Boolean(tool));
  const last = recentTools[0];
  return <section className={full ? "space-y-6" : "toolbox-preview"} aria-labelledby="favorite-tools-heading">
    <div className="section-heading"><h2 id="favorite-tools-heading" className="text-xl font-semibold">{full ? "你的工具" : "我的工具箱"}</h2>{!full && <Link href="/my-toolbox" className="nav-link">查看全部 ↗</Link>}</div>
    {!isLoaded || !recentLoaded ? <div role="status" aria-label="正在读取工具箱" className="skeleton" /> : <>
      {last && <Link href={`/tools/${last.id}`} className="continue-tool"><span><span className="text-sm">继续上次</span><strong className="ml-3">{last.name}</strong></span><span aria-hidden="true">→</span></Link>}
      {favorites.length === 0 && recentTools.length === 0 ? <div className="toolbox-empty"><span aria-hidden="true" className="tool-icon">☆</span><div><p className="font-medium">把顺手的工具，放在这里。</p><p className="mt-1 text-sm text-muted-foreground">点击工具卡片上的星标，即可收藏。数据保存在本机浏览器。</p></div></div> : <>
        <div><h3 className="mb-3 font-medium">收藏工具</h3>{favorites.length ? <div className={full ? "tool-grid" : "flex flex-wrap gap-2"}>{(full ? favorites : favorites.slice(0, 4)).map((tool) => full ? <ToolCard key={tool.id} tool={tool} /> : <Link className="quick-tool" key={tool.id} href={`/tools/${tool.id}`}>{tool.name}</Link>)}</div> : <p className="text-sm text-muted-foreground">还没有收藏工具，点击工具卡片上的星标添加。</p>}</div>
        {recentTools.length > 0 && <div className="mt-5"><h3 className="mb-3 font-medium">最近使用</h3><div className="flex flex-wrap gap-2">{(full ? recentTools : recentTools.slice(0, 4)).map((tool) => <Link className="quick-tool" key={tool.id} href={`/tools/${tool.id}`}>{tool.name}</Link>)}</div></div>}
        <p className="mt-4 text-sm text-muted-foreground">数据保存在本机浏览器，仅记录工具，不保存输入内容与结果。</p>
      </>}
    </>}
  </section>;
}
