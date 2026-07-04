import { useMemo, useState } from "react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import type { SideTemplate, Tag } from "../shared/types";
import { createCardSidesPayload } from "./card-queries";
import { NewCardTagSelector } from "./new-card-tag-selector";

interface NewCardModalProps {
  isOpen: boolean;
  allTags: Tag[];
  deckId: string;
  templates: SideTemplate[];
  onClose: () => void;
  onCreateCard: (
    sides: Array<{ content: string; label: string; position: number }>,
    tagIds: string[]
  ) => Promise<void>;
}

export function NewCardModal({
  allTags,
  deckId,
  isOpen,
  templates,
  onClose,
  onCreateCard
}: NewCardModalProps) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [tagIds, setTagIds] = useState<string[]>([]);
  const filledSidesCount = useMemo(
    () => Object.values(values).filter((value) => value.trim()).length,
    [values]
  );

  if (!isOpen) return null;

  const submit = async () => {
    if (filledSidesCount < 2) return;
    await onCreateCard(createCardSidesPayload(templates, values), tagIds);
    setValues({});
    setTagIds([]);
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

      <Field label="Tags">
        <NewCardTagSelector
          allTags={allTags}
          deckId={deckId}
          selectedTagIds={tagIds}
          onSelectedTagIdsChange={setTagIds}
        />
      </Field>

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
