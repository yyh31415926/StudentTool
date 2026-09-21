import type { ReactNode, SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children?: ReactNode;
};

export function Select({ className = "", ...props }: SelectProps) {
  const classes = [
    "min-h-touch w-full rounded-control border border-border bg-surface px-3 text-base text-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <select {...props} className={classes} />;
}
