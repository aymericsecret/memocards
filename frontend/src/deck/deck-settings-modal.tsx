import { AlertTriangle, Check, CreditCard, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, ConfirmDialog, Field, Modal, ModalHeader } from "../design-system";
import type { DeckDetail } from "../shared/types";
import {
  useDeleteDeckMutation,
  useUpdateDeckMutation,
  useUpdateDeckSideTemplatesMutation
} from "./deck-queries";

const retentionPresets = [
  { description: "Tres intensif - intervalles tres courts, beaucoup de revisions", label: "97%", value: 0.97 },
  { description: "Intensif - intervalles courts pour un apprentissage rapide", label: "95%", value: 0.95 },
  { description: "Soutenu - bon compromis pour une memorisation solide", label: "92%", value: 0.92 },
  { description: "Standard - reglage par defaut de l'algorithme FSRS", label: "90%", value: 0.9 },
  { description: "Detendu - intervalles plus longs, moins de revisions", label: "85%", value: 0.85 },
  { description: "Espace - revisions rares, risque d'oubli plus eleve", label: "80%", value: 0.8 }
];

interface DeckSettingsModalProps {
  deck: DeckDetail;
  isOpen: boolean;
  onClose: () => void;
}

export function DeckSettingsModal({ deck, isOpen, onClose }: DeckSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"retention" | "sides" | "delete">("retention");
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description ?? "");
  const [requestRetention, setRequestRetention] = useState(deck.requestRetention);
  const [sideLabels, setSideLabels] = useState(deck.sideTemplates.map((side) => side.label));
  const [sideIndexToDelete, setSideIndexToDelete] = useState<number | null>(null);
  const [isDeleteDeckConfirmOpen, setIsDeleteDeckConfirmOpen] = useState(false);
  const updateDeckMutation = useUpdateDeckMutation(deck.id);
  const updateSideTemplatesMutation = useUpdateDeckSideTemplatesMutation(deck.id);
  const deleteDeckMutation = useDeleteDeckMutation();

  useEffect(() => {
    if (!isOpen) return;
    setName(deck.name);
    setDescription(deck.description ?? "");
    setRequestRetention(deck.requestRetention);
    setSideLabels(deck.sideTemplates.map((side) => side.label));
  }, [deck, isOpen]);

  if (!isOpen) return null;

  const canSaveDeck = name.trim().length > 0;
  const canSaveSides = sideLabels.filter((label) => label.trim()).length >= 2;

  const saveRetention = async () => {
    if (!canSaveDeck) return;
    await updateDeckMutation.mutateAsync({
      name: name.trim(),
      description: description.trim(),
      requestRetention
    });
    onClose();
  };

  const saveSides = async () => {
    if (!canSaveSides) return;
    await updateSideTemplatesMutation.mutateAsync(
      sideLabels.map((label) => label.trim()).filter(Boolean)
    );
    onClose();
  };

  return (
    <Modal className="deck-settings-modal-panel" labelledBy="deck-settings-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="deck-settings-title">Reglages du paquet</h2>
      </ModalHeader>

      <div className="deck-settings-scroll">
        <div className="modal-tabs-list deck-settings-tabs">
          <button
            className={activeTab === "retention" ? "modal-tab active" : "modal-tab"}
            onClick={() => setActiveTab("retention")}
            type="button"
          >
            <SlidersHorizontal size={14} /> Retention
          </button>
          <button
            className={activeTab === "sides" ? "modal-tab active" : "modal-tab"}
            onClick={() => setActiveTab("sides")}
            type="button"
          >
            <CreditCard size={14} /> Faces
          </button>
          <button
            className={activeTab === "delete" ? "modal-tab active" : "modal-tab danger-tab"}
            onClick={() => setActiveTab("delete")}
            type="button"
          >
            <Trash2 size={14} /> Suppression
          </button>
        </div>

        {activeTab === "retention" && (
          <section className="deck-settings-panel">
            <Field label="Nom">
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
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
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>

            <Button
              className="modal-submit"
              disabled={!canSaveDeck || updateDeckMutation.isPending}
              onClick={() => void saveRetention()}
            >
              <Check size={16} /> Enregistrer
            </Button>
          </section>
        )}

        {activeTab === "sides" && (
          <section className="deck-settings-panel">
            <div className="settings-list">
              {sideLabels.map((label, index) => (
                <Field key={index} label={`Face ${index + 1}`}>
                  <div className="inline-control">
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
                        className="danger"
                        size="icon"
                        onClick={() => setSideIndexToDelete(index)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                  </div>
                </Field>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSideLabels((current) => [...current, ""])}
            >
              <Plus size={14} /> Ajouter une face
            </Button>

            <Button
              className="modal-submit"
              disabled={!canSaveSides || updateSideTemplatesMutation.isPending}
              onClick={() => void saveSides()}
            >
              <Check size={16} /> Enregistrer les faces
            </Button>
          </section>
        )}

        {activeTab === "delete" && (
          <section className="deck-settings-panel">
            <div className="settings-warning danger-zone">
              <AlertTriangle size={16} />
              <span>
                Supprimer ce paquet efface toutes les cartes, tags, types de revision et statistiques.
              </span>
            </div>
            <Button className="danger-primary" onClick={() => setIsDeleteDeckConfirmOpen(true)}>
              <Trash2 size={16} /> Supprimer le paquet
            </Button>
          </section>
        )}
      </div>

      {sideIndexToDelete !== null && (
        <ConfirmDialog
          description={`La face "${sideLabels[sideIndexToDelete] || `Face ${sideIndexToDelete + 1}`}" et son contenu dans les cartes seront supprimes apres enregistrement.`}
          labelledBy="delete-deck-side-title"
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

      {isDeleteDeckConfirmOpen && (
        <ConfirmDialog
          description={`Le paquet "${deck.name}" et toute sa progression seront definitivement supprimes.`}
          isPending={deleteDeckMutation.isPending}
          labelledBy="settings-delete-deck-title"
          title="Supprimer ce paquet ?"
          onCancel={() => setIsDeleteDeckConfirmOpen(false)}
          onConfirm={() => void deleteDeckMutation.mutateAsync(deck.id)}
        />
      )}
    </Modal>
  );
}
