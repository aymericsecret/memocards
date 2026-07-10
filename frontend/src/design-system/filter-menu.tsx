import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";

const dropdownOpenEvent = "memocards:dropdown-open";

interface FilterMenuProps {
  align?: "auto" | "left" | "right";
  children: ReactNode;
  label: string;
  wide?: boolean;
}

export function FilterMenu({ align = "auto", children, label, wide = false }: FilterMenuProps) {
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
    <Root
      $align={align}
      $wide={wide}
      className={wide ? "filter-menu wide" : "filter-menu"}
      ref={ref}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("[data-close-menu]")) {
          setIsOpen(false);
        }
      }}
    >
      <Trigger
        className="filter-menu-trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span>{label}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </Trigger>
      {isOpen && children}
    </Root>
  );
}

const Root = styled.div<{ $align: "auto" | "left" | "right"; $wide: boolean }>`
  position: relative;

  .filter-panel {
    position: absolute;
    right: 0;
    top: 40px;
    z-index: 25;
    min-width: 224px;
    width: ${({ $wide }) => ($wide ? "min(420px, calc(100vw - 32px))" : "min(280px, calc(100vw - 32px))")};
    display: grid;
    gap: 2px;
    padding: 8px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 0;
    background: ${({ theme }) => theme.colors.popover};
    box-shadow: 0 18px 44px -24px hsl(220 15% 22% / 0.3);
  }

  .filter-panel.compact {
    min-width: 224px;
    width: min(250px, calc(100vw - 32px));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex: 1 1 calc(50% - 4px);

    .filter-panel {
      width: min(320px, calc(100vw - 32px));
      max-height: min(340px, calc(100vh - 220px));
      overflow-y: auto;
    }

    &:nth-child(even) .filter-panel {
      left: ${({ $align }) => ($align === "right" ? "auto" : "0")};
      right: ${({ $align }) => ($align === "right" ? "0" : "auto")};
    }

    &:nth-child(odd) .filter-panel {
      left: ${({ $align }) => ($align === "left" ? "0" : "auto")};
      right: ${({ $align }) => ($align === "left" ? "auto" : "0")};
    }

    ${({ $align }) =>
      $align === "left" &&
      `
        .filter-panel {
          left: 0;
          right: auto;
        }
      `}

    ${({ $align }) =>
      $align === "right" &&
      `
        .filter-panel {
          left: auto;
          right: 0;
        }
      `}
  }
`;

const Trigger = styled.button`
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 104px;
  white-space: nowrap;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: 0 11px 0 13px;
  color: ${({ theme }) => theme.colors.foreground};
  background: ${({ theme }) => theme.colors.card};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.35);

  &:hover,
  &[aria-expanded="true"] {
    border-color: hsl(220 9% 46% / 0.55);
    background: hsl(220 14% 96% / 0.55);
  }

  &[aria-expanded="true"] svg {
    transform: rotate(180deg);
  }

  svg {
    color: ${({ theme }) => theme.colors.mutedForeground};
    transition: transform 120ms ease;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
  }
`;
