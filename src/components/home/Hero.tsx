import { ToolSearch } from "./ToolSearch";
import { Mascot } from "./Mascot";
import type { SearchableTool } from "./search-tools";
export function Hero({ tools }: { tools: readonly SearchableTool[] }) {
  return <section aria-labelledby="hero-heading" className="home-hero">
    <div className="relative z-10 min-w-0">
      <p className="mb-3 text-sm font-medium text-primary">STUDENT WORKSPACE · 学生数字工具工作台</p>
      <h1 className="hero-title font-semibold tracking-tight" id="hero-heading">小工具，让学习<br />轻松一点。</h1>
      <p className="mt-4 text-muted-foreground">打开就能用，用完不用管。<br className="md:hidden" />把时间留给更重要的事。</p>
      <div className="mt-6 max-w-xl"><ToolSearch tools={tools} /></div>
      <p className="mt-3 text-sm text-muted-foreground">试着搜索「单位换算」「字数」或「jz」</p>
    </div>
    <div className="hero-art"><div className="hero-orbit" /><Mascot /><span className="hero-art-caption">你的学习工具，随时就位。</span></div>
  </section>;
}
