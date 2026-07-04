import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useUpdateTagMutation
} from "../cards/card-queries";
import { Button, ConfirmDialog, Field, Modal, ModalHeader } from "../design-system";
import type { Tag } from "../shared/types";

interface DeckTagsModalProps {
  deckId: string;
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
}

export function DeckTagsModal({ deckId, isOpen, onClose, tags }: DeckTagsModalProps) {
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const createTagMutation = useCreateTagMutation(deckId);
  const updateTagMutation = useUpdateTagMutation(deckId);
  const deleteTagMutation = useDeleteTagMutation(deckId);

  if (!isOpen) return null;

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await createTagMutation.mutateAsync(name);
    setNewTagName("");
  };

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
  };

  const updateTag = async (tag: Tag) => {
    const name = editingName.trim();
    if (!name || name === tag.name) {
      setEditingTagId(null);
      return;
    }

    await updateTagMutation.mutateAsync({ tagId: tag.id, name });
    setEditingTagId(null);
  };

  const deleteSelectedTag = async () => {
    if (!tagToDelete) return;
    await deleteTagMutation.mutateAsync(tagToDelete.id);
    setTagToDelete(null);
  };

  return (
    <Modal labelledBy="deck-tags-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="deck-tags-title">Gerer les tags</h2>
      </ModalHeader>

      <div className="deck-tags-modal">
        <Field label="Nouveau tag">
          <div className="inline-control">
            <input
              value={newTagName}
              onChange={(event) => setNewTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createTag();
                }
              }}
              placeholder="Ex: vocabulaire"
            />
            <Button
              size="icon"
              disabled={!newTagName.trim() || createTagMutation.isPending}
              onClick={() => void createTag()}
              aria-label="Ajouter"
            >
              <Plus size={16} />
            </Button>
          </div>
        </Field>

        <div className="settings-list">
          {tags.length === 0 ? (
            <p className="modal-description">Aucun tag pour ce paquet.</p>
          ) : (
            tags.map((tag) => (
              <div className="settings-row" key={tag.id}>
                <input
                  value={editingTagId === tag.id ? editingName : tag.name}
                  readOnly={editingTagId !== tag.id}
                  onChange={(event) => setEditingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && editingTagId === tag.id) {
                      event.preventDefault();
                      void updateTag(tag);
                    }
                    if (event.key === "Escape") {
                      setEditingTagId(null);
                    }
                  }}
                  autoFocus={editingTagId === tag.id}
                />

                <div className="row-actions">
                  {editingTagId === tag.id ? (
                    <>
                      <Button size="icon" onClick={() => void updateTag(tag)} aria-label="Enregistrer">
                        <Check size={15} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingTagId(null)}
                        aria-label="Annuler"
                      >
                        <X size={15} />
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => startEditing(tag)} aria-label="Modifier">
                      <Pencil size={15} />
                    </Button>
                  )}
                  <Button
                    className="danger"
                    size="icon"
                    onClick={() => setTagToDelete(tag)}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {tagToDelete && (
        <ConfirmDialog
          description={`Le tag "${tagToDelete.name}" sera retire du paquet et de toutes les cartes associees.`}
          isPending={deleteTagMutation.isPending}
          labelledBy="delete-tag-title"
          title="Supprimer ce tag ?"
          onCancel={() => setTagToDelete(null)}
          onConfirm={() => void deleteSelectedTag()}
        />
      )}
    </Modal>
  );
}
