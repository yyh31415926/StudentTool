import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-header w-full max-w-content items-center justify-between gap-4 px-page md:px-page-lg">
        <Link
          className="inline-flex min-h-touch items-center gap-3 rounded-control px-2 text-base font-semibold tracking-tight transition-colors hover:bg-surface-muted"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-control bg-primary text-sm font-bold text-primary-foreground"
          >
            S
          </span>
          <span>StudentTool</span>
        </Link>

        <nav aria-label="主导航" className="flex items-center">
          <Link
            className="inline-flex min-h-touch items-center rounded-control px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            href="/"
          >
            首页
          </Link>
        </nav>
      </div>
    </header>
  );
}
