import type { LabelHTMLAttributes, ReactNode } from "react";

interface FieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  label: string;
}

export function Field({ children, label, className = "", ...props }: FieldProps) {
  return (
    <label className={["field", className].filter(Boolean).join(" ")} {...props}>
      <span>{label}</span>
      {children}
    </label>
  );
}
