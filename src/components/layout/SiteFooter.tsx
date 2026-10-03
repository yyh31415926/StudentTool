export function SiteFooter() {
  return <footer className="border-t border-border bg-surface">
    <div className="mx-auto flex w-full max-w-content flex-col gap-3 px-page py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-page-lg">
      <div><p className="font-medium text-foreground">StudentTool · 学生数字工具工作台</p><p className="mt-1">made by YYH</p></div>
      <nav aria-label="页脚导航" className="flex gap-4">
        <a className="nav-link" href="https://github.com/yyh31415926/StudentTool#readme" target="_blank" rel="noreferrer">关于与开源 ↗</a>
        <a className="nav-link" href="https://github.com/yyh31415926/StudentTool/issues" target="_blank" rel="noreferrer">反馈 ↗</a>
      </nav>
    </div>
  </footer>;
}
