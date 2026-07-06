import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Button } from "./button";

interface ModalProps {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  onClose: () => void;
}

export function Modal({ children, className = "", labelledBy, onClose }: ModalProps) {
  const panelClassName = ["modal-panel", className].filter(Boolean).join(" ");
  const modal = (
    <Backdrop className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <Panel
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </Panel>
    </Backdrop>
  );

  return createPortal(modal, document.body);
}

export function ModalHeader({
  children,
  onClose
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Header className="modal-header">
      {children}
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
        x
      </Button>
    </Header>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: hsl(220 15% 22% / 0.38);
  isolation: isolate;
`;

const Panel = styled.section`
  position: relative;
  z-index: 1001;
  width: min(100%, 460px);
  display: grid;
  gap: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: 22px;
  background: ${({ theme }) => theme.colors.card};
  box-shadow: ${({ theme }) => theme.shadows.modal};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizes.xl};
    letter-spacing: 0;
  }
`;
