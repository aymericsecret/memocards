import type { InputHTMLAttributes, ReactNode } from "react";
import styled from "styled-components";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
}

export function Input({ className = "", leading, ...props }: InputProps) {
  return (
    <InputShell className={["input-shell", className].filter(Boolean).join(" ")}>
      {leading && <span className="input-leading">{leading}</span>}
      <input {...props} />
    </InputShell>
  );
}

const InputShell = styled.div`
  min-width: 0;
  height: ${({ theme }) => theme.sizes.input};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.colors.mutedForeground};

  .input-leading {
    display: inline-flex;
    flex: 0 0 auto;
    color: currentColor;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    padding: 0;
    color: ${({ theme }) => theme.colors.foreground};
    background: transparent;
    outline: none;
  }
`;
