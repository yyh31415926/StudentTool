import Link from "next/link";
import Image from "next/image";
import { FavoriteToolsDropdown } from "./FavoriteToolsDropdown";
import { ToolSearch } from "@/components/home/ToolSearch";
import { getAllTools } from "@/lib/tools/registry";
import { getAvailableCategories } from "@/lib/tools/categories";
export function SiteHeader() {
  const tools = getAllTools();
  const searchableTools = tools.map(({ id, name, category, summary, keywords, tags, pinyin }) => ({ id, name, category, summary, keywords, tags, pinyin }));
  const categories = getAvailableCategories(tools);
  return <header className="site-header border-b border-border bg-surface">
    <div className="header-inner mx-auto w-full max-w-content px-page md:px-page-lg">
      <Link className="brand-link" href="/"><Image className="brand-mark" src="/logo-character.png" alt="" width={32} height={32} sizes="32px" priority /><span>StudentTool</span></Link>
      <div className="header-search"><ToolSearch tools={searchableTools} categories={categories} /></div>
      <nav aria-label="主导航" className="flex items-center gap-1">
        <Link className="nav-link" href="/my-toolbox">我的工具箱</Link>
        <FavoriteToolsDropdown tools={tools.map(({ id, name, category }) => ({ id, name, category }))} />
      </nav>
    </div>
  </header>;
}
