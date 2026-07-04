import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = [
    variant === "ghost" || size === "icon" ? "ghost-icon" : variant,
    size === "sm" ? "small" : "",
    size === "icon" ? "icon-button" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
