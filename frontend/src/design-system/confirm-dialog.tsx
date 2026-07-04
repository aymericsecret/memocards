import { Button } from "./button";
import { Modal, ModalHeader } from "./modal";

interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  labelledBy: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function ConfirmDialog({
  cancelLabel = "Annuler",
  confirmLabel = "Supprimer",
  description,
  isPending = false,
  labelledBy,
  onCancel,
  onConfirm,
  title
}: ConfirmDialogProps) {
  return (
    <Modal labelledBy={labelledBy} onClose={onCancel}>
      <ModalHeader onClose={onCancel}>
        <h2 id={labelledBy}>{title}</h2>
      </ModalHeader>
      <p className="modal-description">{description}</p>
      <div className="modal-actions">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button className="danger-primary" disabled={isPending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
