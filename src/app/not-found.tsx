import Link from "next/link";
import { ToolSearch } from "@/components/home/ToolSearch";
import { getAllTools } from "@/lib/tools/registry";

export default function NotFound() {
  const tools = getAllTools().map(({ id, name, category, summary, keywords, tags, pinyin }) => ({ id, name, category, summary, keywords, tags, pinyin }));
  return <div className="mx-auto w-full max-w-xl px-page py-16">
    <p className="font-mono text-primary">404</p><h1 className="mt-3 text-3xl font-semibold">这个页面暂时找不到了</h1>
    <p className="my-6 text-muted-foreground">可以搜索需要的工具，或回到首页继续浏览。</p><ToolSearch tools={tools} />
    <Link href="/" className="nav-link mt-6">← 返回首页</Link>
  </div>;
}
