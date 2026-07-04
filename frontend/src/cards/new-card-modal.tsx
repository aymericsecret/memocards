import { useMemo, useState } from "react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import type { SideTemplate } from "../shared/types";
import { createCardSidesPayload } from "./card-queries";

interface NewCardModalProps {
  isOpen: boolean;
  templates: SideTemplate[];
  onClose: () => void;
  onCreateCard: (
    sides: Array<{ content: string; label: string; position: number }>
  ) => Promise<void>;
}

export function NewCardModal({
  isOpen,
  templates,
  onClose,
  onCreateCard
}: NewCardModalProps) {
  const [values, setValues] = useState<Record<number, string>>({});
  const filledSidesCount = useMemo(
    () => Object.values(values).filter((value) => value.trim()).length,
    [values]
  );

  if (!isOpen) return null;

  const submit = async () => {
    if (filledSidesCount < 2) return;
    await onCreateCard(createCardSidesPayload(templates, values));
    setValues({});
    onClose();
  };

  return (
    <Modal labelledBy="new-card-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="new-card-title">Nouvelle carte</h2>
      </ModalHeader>

      <div className="side-list">
        {templates.map((template) => (
          <Field key={template.id} label={template.label}>
            <textarea
              rows={4}
              value={values[template.position] ?? ""}
              onChange={(event) =>
                setValues({
                  ...values,
                  [template.position]: event.target.value
                })
              }
              placeholder={`${template.label}...`}
            />
          </Field>
        ))}
      </div>

      <Button
        className="modal-submit"
        disabled={filledSidesCount < 2}
        onClick={() => void submit()}
      >
        Ajouter la carte
      </Button>
    </Modal>
  );
}
