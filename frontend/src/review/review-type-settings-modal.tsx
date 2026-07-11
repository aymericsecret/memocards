import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import type { ReviewType, SideTemplate } from "../shared/types";

const retentionPresets = [
  { label: "Intensif", value: 0.85 },
  { label: "Standard", value: 0.9 },
  { label: "Espacement long", value: 0.95 }
];

interface ReviewTypeSettingsModalProps {
  isOpen: boolean;
  reviewType: ReviewType | null;
  templates: SideTemplate[];
  onClose: () => void;
  onResetProgress: (reviewTypeId: string) => Promise<void>;
  onUpdateReviewType: (
    reviewTypeId: string,
    values: { backSidePosition: number | null; name: string; requestRetention: number }
  ) => Promise<void>;
}

export function ReviewTypeSettingsModal({
  isOpen,
  reviewType,
  templates,
  onClose,
  onResetProgress,
  onUpdateReviewType
}: ReviewTypeSettingsModalProps) {
  const [backSidePosition, setBackSidePosition] = useState("");
  const [name, setName] = useState("");
  const [requestRetention, setRequestRetention] = useState(0.9);

  useEffect(() => {
    if (!reviewType) return;
    setBackSidePosition(
      reviewType.backSidePosition === null ? "" : String(reviewType.backSidePosition)
    );
    setName(reviewType.name);
    setRequestRetention(reviewType.requestRetention);
  }, [reviewType]);

  if (!isOpen || !reviewType) return null;

  const frontSideLabel =
    templates.find((template) => template.position === reviewType.frontSidePosition)?.label ??
    `Position ${reviewType.frontSidePosition}`;

  const submit = async () => {
    if (!name.trim()) return;
    await onUpdateReviewType(reviewType.id, {
      backSidePosition: backSidePosition === "" ? null : Number(backSidePosition),
      name: name.trim(),
      requestRetention
    });
    onClose();
  };

  return (
    <Modal labelledBy="review-type-settings-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="review-type-settings-title">Reglages</h2>
      </ModalHeader>

      <Field label="Nom">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>

      <Field label="Face affichee">
        <input readOnly value={frontSideLabel} />
      </Field>

      <Field label="Seconde face requise">
        <select
          value={backSidePosition}
          onChange={(event) => setBackSidePosition(event.target.value)}
        >
          <option value="">Aucune</option>
          {templates.map((template) => (
            <option key={template.id} value={template.position}>
              {template.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="retention-list">
        {retentionPresets.map((preset) => (
          <button
            className={requestRetention === preset.value ? "retention active" : "retention"}
            key={preset.value}
            type="button"
            onClick={() => setRequestRetention(preset.value)}
          >
            <strong>{preset.label}</strong>
            <span>{Math.round(preset.value * 100)}% de retention</span>
          </button>
        ))}
      </div>

      <div className="settings-warning">
        <AlertTriangle size={16} />
        <span>Reinitialiser supprime l'historique de revision de ce type.</span>
      </div>

      <div className="modal-actions modal-footer">
        <Button
          className="danger-outline"
          variant="outline"
          onClick={() => void onResetProgress(reviewType.id)}
        >
          Reinitialiser
        </Button>
        <Button disabled={!name.trim()} onClick={() => void submit()}>
          Enregistrer
        </Button>
      </div>
    </Modal>
  );
}
