import { Plus } from "lucide-react";
import { useState } from "react";
import { Button, ConfirmDialog, Field, Modal, ModalHeader } from "../design-system";

interface CreateDeckInput {
  description: string;
  name: string;
  sideLabels: string[];
}

interface NewDeckModalProps {
  onClose: () => void;
  onCreate: (input: CreateDeckInput) => void;
}

export function NewDeckModal({ onClose, onCreate }: NewDeckModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sideLabels, setSideLabels] = useState(["Recto", "Verso"]);
  const [sideIndexToDelete, setSideIndexToDelete] = useState<number | null>(null);

  const canCreate =
    name.trim().length > 0 &&
    sideLabels.filter((sideLabel) => sideLabel.trim()).length >= 2;

  const submit = () => {
    if (!canCreate) return;

    onCreate({
      name: name.trim(),
      description: description.trim(),
      sideLabels: sideLabels.map((label) => label.trim()).filter(Boolean)
    });
  };

  return (
    <Modal labelledBy="create-deck-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="create-deck-title">Nouveau paquet</h2>
      </ModalHeader>

      <Field label="Nom">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Japonais N5"
          autoFocus
        />
      </Field>

      <Field label="Description (optionnel)">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Vocabulaire du JLPT N5..."
          rows={2}
        />
      </Field>

      <div className="field">
        <span>Faces des cartes</span>
        <div className="side-list">
          {sideLabels.map((label, index) => (
            <div className="side-row" key={index}>
              <input
                value={label}
                onChange={(event) =>
                  setSideLabels((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    )
                  )
                }
                placeholder={`Face ${index + 1}`}
              />
              {sideLabels.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSideIndexToDelete(index)}
                  aria-label="Supprimer la face"
                >
                  x
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSideLabels((current) => [...current, ""])}
        >
          <Plus size={14} /> Ajouter une face
        </Button>
      </div>

      <Button className="modal-submit" disabled={!canCreate} onClick={submit}>
        Creer le paquet
      </Button>

      {sideIndexToDelete !== null && (
        <ConfirmDialog
          description={`La face "${sideLabels[sideIndexToDelete] || `Face ${sideIndexToDelete + 1}`}" sera retiree de ce nouveau paquet.`}
          labelledBy="delete-side-title"
          title="Supprimer cette face ?"
          onCancel={() => setSideIndexToDelete(null)}
          onConfirm={() => {
            setSideLabels((current) =>
              current.filter((_, itemIndex) => itemIndex !== sideIndexToDelete)
            );
            setSideIndexToDelete(null);
          }}
        />
      )}
    </Modal>
  );
}
