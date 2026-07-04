import type { ReactNode } from "react";
import { Button } from "./button";

interface ModalProps {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
}

export function Modal({ children, labelledBy, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}

export function ModalHeader({
  children,
  onClose
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-header">
      {children}
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
        x
      </Button>
    </div>
  );
}
