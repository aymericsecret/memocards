import { Filter } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

const dropdownOpenEvent = "memocards:dropdown-open";

interface FilterMenuProps {
  children: ReactNode;
  label: string;
  wide?: boolean;
}

export function FilterMenu({ children, label, wide = false }: FilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const onOtherDropdownOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(dropdownOpenEvent, onOtherDropdownOpen);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(dropdownOpenEvent, onOtherDropdownOpen);
    };
  }, [id, isOpen]);

  const toggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      window.dispatchEvent(new CustomEvent(dropdownOpenEvent, { detail: id }));
    }
  };

  return (
    <div
      className={wide ? "filter-menu wide" : "filter-menu"}
      ref={ref}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("[data-close-menu]")) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="filter-menu-trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <Filter size={14} /> {label}
      </button>
      {isOpen && children}
    </div>
  );
}
