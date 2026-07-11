import { useState } from "react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import type { SideTemplate, Tag } from "../shared/types";

interface NewReviewTypeModalProps {
  isOpen: boolean;
  tags: Tag[];
  templates: SideTemplate[];
  onClose: () => void;
  onCreateReviewType: (input: {
    backSidePosition: number | null;
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
  const [backSidePosition, setBackSidePosition] = useState("");
  const [name, setName] = useState("");
  const [tagId, setTagId] = useState("");

  if (!isOpen) return null;

  const submit = async () => {
    if (!name.trim()) return;
    await onCreateReviewType({
      backSidePosition: backSidePosition === "" ? null : Number(backSidePosition),
      frontSidePosition,
      name: name.trim(),
      tagId: tagId || null
    });
    setBackSidePosition("");
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

      <Field label="Face affichee">
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

      <Field label="Tag">
        <select value={tagId} onChange={(event) => setTagId(event.target.value)}>
          <option value="">Toutes les cartes</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="modal-footer">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button className="modal-submit" disabled={!name.trim()} onClick={() => void submit()}>
          Creer le type de revision
        </Button>
      </div>
    </Modal>
  );
}
