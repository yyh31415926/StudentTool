import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-muted disabled:opacity-50",
  ghost:
    "bg-transparent text-foreground hover:bg-surface-muted disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-touch px-3 text-sm",
  md: "min-h-touch px-4 text-base",
};

export function Button({
  className = "",
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-opacity",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button {...props} className={classes} />;
}
