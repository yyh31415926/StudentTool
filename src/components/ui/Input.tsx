import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className = "", ...props }, ref) {
  const classes = [
    "min-h-touch w-full rounded-control border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted-foreground",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input {...props} ref={ref} className={classes} />;
});
