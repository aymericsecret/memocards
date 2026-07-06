import { MoreHorizontal } from "lucide-react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import styled from "styled-components";

const actionMenuOpenEvent = "memocards:dropdown-open";

interface ActionMenuProps {
  children: ReactNode;
  className?: string;
  label: string;
}

interface ActionMenuItemProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  pending?: boolean;
}

export function ActionMenu({ children, className = "", label }: ActionMenuProps) {
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
    const onOtherMenuOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(actionMenuOpenEvent, onOtherMenuOpen);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(actionMenuOpenEvent, onOtherMenuOpen);
    };
  }, [id, isOpen]);

  const toggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      window.dispatchEvent(new CustomEvent(actionMenuOpenEvent, { detail: id }));
    }
  };

  return (
    <Root className={["action-menu", className].filter(Boolean).join(" ")} ref={ref}>
      <Trigger
        className="action-menu-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={toggle}
      >
        <MoreHorizontal size={18} />
      </Trigger>
      {isOpen && (
        <Panel
          className="action-menu-panel"
          role="menu"
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const menuItem = target.closest<HTMLButtonElement>("button[role='menuitem']");
            if (menuItem && menuItem.getAttribute("aria-disabled") !== "true") {
              setIsOpen(false);
            }
          }}
        >
          {children}
        </Panel>
      )}
    </Root>
  );
}

export function ActionMenuItem({
  children,
  className = "",
  disabled = false,
  onClick,
  pending = false
}: ActionMenuItemProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (pending) {
      event.preventDefault();
      return;
    }
    void onClick?.();
  };

  return (
    <ItemButton
      className={className}
      type="button"
      disabled={disabled}
      aria-disabled={pending}
      onClick={handleClick}
      role="menuitem"
    >
      {children}
      {pending && <PendingPill>Bientot</PendingPill>}
    </ItemButton>
  );
}

const Root = styled.div`
  position: relative;
  display: inline-flex;

  &.push-right {
    margin-left: auto;
  }
`;

const Trigger = styled.button`
  width: ${({ theme }) => theme.sizes.iconButton};
  height: ${({ theme }) => theme.sizes.iconButton};
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.mutedForeground};
  background: transparent;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.accentForeground};
    background: ${({ theme }) => theme.colors.accent};
  }
`;

const Panel = styled.div`
  position: absolute;
  right: 0;
  top: 42px;
  z-index: 20;
  min-width: 240px;
  max-width: min(340px, calc(100vw - 32px));
  width: max-content;
  display: grid;
  grid-auto-flow: row;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.space[2]};
  padding: ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.popover};
  box-shadow: ${({ theme }) => theme.shadows.popover};
`;

const ItemButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  height: ${({ theme }) => theme.sizes.menuItem};
  border: 0;
  border-radius: 0;
  padding: 0 ${({ theme }) => theme.space[5]};
  color: ${({ theme }) => theme.colors.foreground};
  background: transparent;
  text-align: left;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.muted};
  }

  &[aria-disabled="true"] {
    color: ${({ theme }) => theme.colors.mutedForeground};
  }

  &.danger-menu-item {
    color: ${({ theme }) => theme.colors.destructive};
  }
`;

const PendingPill = styled.span`
  margin-left: auto;
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: ${({ theme }) => theme.space[1]} 7px;
  color: ${({ theme }) => theme.colors.mutedForeground};
  background: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 700;
`;
