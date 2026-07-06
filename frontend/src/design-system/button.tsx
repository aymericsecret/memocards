import type { ButtonHTMLAttributes, ReactNode } from "react";
import styled, { css } from "styled-components";

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
  const legacyClasses = [
    variant === "ghost" || size === "icon" ? "ghost-icon" : variant,
    size === "sm" ? "small" : "",
    size === "icon" ? "icon-button" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <StyledButton
      $size={size}
      $variant={variant}
      className={legacyClasses}
      {...props}
    >
      {children}
    </StyledButton>
  );
}

const StyledButton = styled.button<{
  $size: ButtonSize;
  $variant: ButtonVariant;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-weight: 500;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;

  ${({ $size }) =>
    $size === "icon"
      ? css`
          width: ${({ theme }) => theme.sizes.iconButton};
          height: ${({ theme }) => theme.sizes.iconButton};
          border: 0;
          padding: 0;
        `
      : css`
          min-height: ${({ theme }) =>
            $size === "sm" ? theme.sizes.controlSm : theme.sizes.controlMd};
          border: 1px solid transparent;
          padding: 0 ${({ theme }) => ($size === "sm" ? theme.space[6] : theme.space[8])};
          font-size: ${({ theme }) =>
            $size === "sm" ? theme.fontSizes.sm : theme.fontSizes.md};
        `}

  ${({ $size, $variant, theme }) => {
    if ($variant === "primary" && $size !== "icon") {
      return css`
        color: ${theme.colors.primaryForeground};
        background: ${theme.colors.primary};
        border-color: ${theme.colors.primary};

        &:hover:not(:disabled) {
          background: hsl(220 15% 22% / 0.9);
        }
      `;
    }

    if ($variant === "outline" && $size !== "icon") {
      return css`
        color: ${theme.colors.foreground};
        background: ${theme.colors.background};
        border-color: ${theme.colors.input};

        &:hover:not(:disabled) {
          color: ${theme.colors.accentForeground};
          background: ${theme.colors.accent};
        }
      `;
    }

    return css`
      color: ${theme.colors.mutedForeground};
      background: transparent;

      &:hover:not(:disabled) {
        color: ${theme.colors.accentForeground};
        background: ${theme.colors.accent};
      }
    `;
  }}

  &.danger:hover:not(:disabled),
  &.danger-primary {
    color: ${({ theme }) => theme.colors.primaryForeground};
    background: ${({ theme }) => theme.colors.destructive};
    border-color: ${({ theme }) => theme.colors.destructive};
  }

  &.danger-outline {
    color: ${({ theme }) => theme.colors.destructive};
  }

  &.push-right {
    margin-left: auto;
  }
`;
