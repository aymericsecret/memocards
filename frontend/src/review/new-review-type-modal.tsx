import { useState } from "react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import type { SideTemplate, Tag } from "../shared/types";

interface NewReviewTypeModalProps {
  isOpen: boolean;
  tags: Tag[];
  templates: SideTemplate[];
  onClose: () => void;
  onCreateReviewType: (input: {
    frontSidePosition: number;
    name: string;
    tagId: string | null;
  }) => Promise<void>;
}

export function NewReviewTypeModal({
  isOpen,
  tags,
  templates,
  onClose,
  onCreateReviewType
}: NewReviewTypeModalProps) {
  const [frontSidePosition, setFrontSidePosition] = useState(templates[0]?.position ?? 0);
  const [name, setName] = useState("");
  const [tagId, setTagId] = useState("");

  if (!isOpen) return null;

  const submit = async () => {
    if (!name.trim()) return;
    await onCreateReviewType({
      frontSidePosition,
      name: name.trim(),
      tagId: tagId || null
    });
    setName("");
    setTagId("");
    onClose();
  };

  return (
    <Modal labelledBy="new-review-type-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="new-review-type-title">Nouveau type de revision</h2>
      </ModalHeader>

      <Field label="Nom">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Recto vers verso"
        />
      </Field>

      <label className="field">
        <span>Face affichee</span>
        <select
          value={frontSidePosition}
          onChange={(event) => setFrontSidePosition(Number(event.target.value))}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.position}>
              {template.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Tag</span>
        <select value={tagId} onChange={(event) => setTagId(event.target.value)}>
          <option value="">Toutes les cartes</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>

      <Button className="modal-submit" disabled={!name.trim()} onClick={() => void submit()}>
        Creer le type de revision
      </Button>
    </Modal>
  );
}
