import Link from "next/link";
import { ToolSearch } from "@/components/home/ToolSearch";
import { getAllTools } from "@/lib/tools/registry";
export function SiteHeader() {
  const tools = getAllTools().map(({ id, name, category, summary, keywords, tags, pinyin }) => ({ id, name, category, summary, keywords, tags, pinyin }));
  return <header className="site-header border-b border-border bg-surface">
    <div className="header-inner mx-auto w-full max-w-content px-page md:px-page-lg">
      <Link className="brand-link" href="/"><span aria-hidden="true" className="brand-mark">S<span /></span><span>StudentTool</span></Link>
      <div className="header-search"><ToolSearch tools={tools} /></div>
      <nav aria-label="主导航" className="flex items-center gap-1">
        <Link className="nav-link" href="/my-toolbox">我的工具箱</Link>
        <a className="nav-link desktop-nav" href="https://github.com/yyh31415926/StudentTool" target="_blank" rel="noreferrer">开源 ↗</a>
      </nav>
    </div>
  </header>;
}
