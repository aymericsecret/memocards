import type { HTMLAttributes, ReactNode } from "react";
import styled from "styled-components";

interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  label: string;
}

export function Field({ children, label, className = "", ...props }: FieldProps) {
  return (
    <StyledField className={["field", className].filter(Boolean).join(" ")} {...props}>
      <span>{label}</span>
      {children}
    </StyledField>
  );
}

const StyledField = styled.div`
  display: grid;
  gap: 7px;

  > span {
    color: ${({ theme }) => theme.colors.mutedForeground};
    font-size: 0.86rem;
    font-weight: 650;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
    height: ${({ theme }) => theme.sizes.input};
    border: 1px solid ${({ theme }) => theme.colors.input};
    border-radius: calc(${({ theme }) => theme.radii.md} - 2px);
    padding: 0 ${({ theme }) => theme.space[6]};
    color: ${({ theme }) => theme.colors.foreground};
    background: ${({ theme }) => theme.colors.background};
    outline: none;
    appearance: none;
  }

  textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid ${({ theme }) => theme.colors.input};
    border-radius: calc(${({ theme }) => theme.radii.md} - 2px);
    padding: 9px ${({ theme }) => theme.space[6]};
    color: ${({ theme }) => theme.colors.foreground};
    background: ${({ theme }) => theme.colors.background};
    outline: none;
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: ${({ theme }) => theme.colors.input};
    box-shadow: none;
  }
`;
