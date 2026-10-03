import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto w-full max-w-xl px-page py-16">
    <p className="font-mono text-primary">404</p><h1 className="mt-3 text-3xl font-semibold">这个页面暂时找不到了</h1>
    <p className="my-6 text-muted-foreground">地址可能已经变化。你可以用顶部搜索框查找工具，或回到首页继续浏览。</p>
    <Link href="/" className="nav-link">← 返回首页</Link>
  </div>;
}
