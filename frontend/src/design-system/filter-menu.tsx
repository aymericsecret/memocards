import { Filter } from "lucide-react";
import type { ReactNode } from "react";

interface FilterMenuProps {
  children: ReactNode;
  label: string;
  wide?: boolean;
}

export function FilterMenu({ children, label, wide = false }: FilterMenuProps) {
  return (
    <details className={wide ? "filter-menu wide" : "filter-menu"}>
      <summary>
        <Filter size={14} /> {label}
      </summary>
      {children}
    </details>
  );
}
