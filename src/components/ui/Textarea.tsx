import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  const classes = [
    "min-h-32 w-full resize-y rounded-control border border-border bg-surface px-3 py-3 text-base text-foreground placeholder:text-muted-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <textarea {...props} className={classes} />;
}
