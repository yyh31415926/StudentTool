import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
};

/**
 * 面包屑导航。最后一项为当前页（无链接，aria-current="page"），
 * 其余项若带 href 则渲染为链接。
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="面包屑">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex items-center gap-2" key={index}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
