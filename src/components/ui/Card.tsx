import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  const classes = [
    "rounded-card border border-border bg-surface p-page-lg shadow-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div {...props} className={classes} />;
}
