import { MoreHorizontal } from "lucide-react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

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
    <div className={`action-menu ${className}`.trim()} ref={ref}>
      <button
        className="action-menu-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={toggle}
      >
        <MoreHorizontal size={18} />
      </button>
      {isOpen && (
        <div
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
        </div>
      )}
    </div>
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
    <button
      className={className}
      type="button"
      disabled={disabled}
      aria-disabled={pending}
      onClick={handleClick}
      role="menuitem"
    >
      {children}
      {pending && <span className="pending-pill">Bientot</span>}
    </button>
  );
}
