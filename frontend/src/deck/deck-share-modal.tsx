import { Bot, Check, CopyIcon, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import { api, publicApiUrl } from "../shared/api";
import type { ReviewType, SideTemplate } from "../shared/types";

interface PublicShare {
  createdAt: string;
  id: string;
  mode: "ai" | "people";
  reviewTypeId: string | null;
  reviewTypeName: string | null;
  sidePositions: number[];
  token: string;
  updatedAt: string;
}

interface DeckShareModalProps {
  deckId: string;
  isOpen: boolean;
  reviewTypes: ReviewType[];
  templates: SideTemplate[];
  onClose: () => void;
}

export function DeckShareModal({
  deckId,
  isOpen,
  onClose,
  reviewTypes,
  templates
}: DeckShareModalProps) {
  const defaultReviewType = reviewTypes.find((reviewType) => reviewType.isDefault) ?? reviewTypes[0];
  const [reviewTypeId, setReviewTypeId] = useState(defaultReviewType?.id ?? "");
  const [sidePositions, setSidePositions] = useState<number[]>(
    templates[0] ? [templates[0].position] : []
  );
  const [shares, setShares] = useState<PublicShare[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [deletingShareId, setDeletingShareId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedToken) return undefined;

    const timeout = window.setTimeout(() => setCopiedToken(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [copiedToken]);

  useEffect(() => {
    if (!isOpen) return;

    const currentReviewTypeExists = reviewTypes.some(
      (reviewType) => reviewType.id === reviewTypeId
    );
    if (!currentReviewTypeExists && defaultReviewType) {
      setReviewTypeId(defaultReviewType.id);
    }

    if (sidePositions.length === 0 && templates[0]) {
      setSidePositions([templates[0].position]);
    }
  }, [defaultReviewType, isOpen, reviewTypeId, reviewTypes, sidePositions.length, templates]);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    setIsLoadingShares(true);
    void api<{ shares: PublicShare[] }>(`/decks/${deckId}/public-shares`)
      .then((result) => {
        if (!ignore) setShares(result.shares);
      })
      .finally(() => {
        if (!ignore) setIsLoadingShares(false);
      });

    return () => {
      ignore = true;
    };
  }, [deckId, isOpen]);

  if (!isOpen) return null;

  const getShareUrl = (publicShare: PublicShare) =>
    `${publicApiUrl()}/public/shares/${publicShare.token}.md`;

  const formatShareSides = (positions: number[]) =>
    positions
      .map((position) => templates.find((template) => template.position === position)?.label)
      .filter(Boolean)
      .join(", ");

  const toggleSide = (position: number) => {
    setSidePositions((currentPositions) => {
      if (currentPositions.includes(position)) {
        return currentPositions.filter((candidate) => candidate !== position);
      }

      return [...currentPositions, position].sort((a, b) => a - b);
    });
  };

  const createShare = async () => {
    if (!reviewTypeId || sidePositions.length === 0) return;
    setIsSharing(true);
    setCopiedToken(null);

    try {
      const result = await api<{ share: PublicShare }>(`/decks/${deckId}/public-shares`, {
        method: "POST",
        body: JSON.stringify({
          mode: "ai",
          reviewTypeId,
          sidePositions
        })
      });
      setShares((currentShares) => {
        const withoutExisting = currentShares.filter(
          (currentShare) => currentShare.id !== result.share.id
        );
        return [result.share, ...withoutExisting];
      });
    } finally {
      setIsSharing(false);
    }
  };

  const deleteShare = async (publicShare: PublicShare) => {
    setDeletingShareId(publicShare.id);

    try {
      await api<{ id: string }>(`/public-shares/${publicShare.id}`, {
        method: "DELETE"
      });
      setShares((currentShares) =>
        currentShares.filter((currentShare) => currentShare.id !== publicShare.id)
      );
    } finally {
      setDeletingShareId(null);
    }
  };

  const copyShareUrl = async (publicShare: PublicShare) => {
    await navigator.clipboard.writeText(getShareUrl(publicShare));
    setCopiedToken(publicShare.token);
  };

  return (
    <Modal className="share-modal-panel" labelledBy="share-ai-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <div className="modal-title-row">
          <Bot size={20} />
          <h2 id="share-ai-title">Partager a l'IA</h2>
        </div>
      </ModalHeader>

      <div className="share-modal-body">
        <p className="modal-description">
          Cree une URL publique Markdown toujours a jour avec les cartes connues du paquet.
        </p>

        <div className="share-existing-list">
          <div>
            <p className="detail-section-title">Liens existants</p>
            {isLoadingShares && <span>Chargement...</span>}
          </div>
          {!isLoadingShares && shares.length === 0 ? (
            <p className="share-empty">Aucun lien public pour ce paquet.</p>
          ) : (
            shares.map((publicShare) => (
              <article className="share-existing-item" key={publicShare.id}>
                <div>
                  <strong>{publicShare.reviewTypeName ?? "Type de revision"}</strong>
                  <span>{formatShareSides(publicShare.sidePositions)}</span>
                  <code>{getShareUrl(publicShare)}</code>
                </div>
                <div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Copier"
                    onClick={() => void copyShareUrl(publicShare)}
                  >
                    {copiedToken === publicShare.token ? (
                      <Check size={15} />
                    ) : (
                      <CopyIcon size={15} />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Ouvrir"
                    onClick={() =>
                      window.open(getShareUrl(publicShare), "_blank", "noopener,noreferrer")
                    }
                  >
                    <ExternalLink size={15} />
                  </Button>
                  <Button
                    className="danger"
                    disabled={deletingShareId === publicShare.id}
                    size="icon"
                    variant="ghost"
                    aria-label="Supprimer"
                    onClick={() => void deleteShare(publicShare)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>

        <Field label="Type de revision">
          <select
            disabled={reviewTypes.length === 0}
            onChange={(event) => {
              setReviewTypeId(event.target.value);
            }}
            value={reviewTypeId}
          >
            {reviewTypes.map((reviewType) => (
              <option key={reviewType.id} value={reviewType.id}>
                {reviewType.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="share-side-list">
          <p className="detail-section-title">Faces exposees</p>
          {templates.map((template) => (
            <label className="check-row" key={template.id}>
              <span>{template.label}</span>
              <input
                checked={sidePositions.includes(template.position)}
                onChange={() => toggleSide(template.position)}
                type="checkbox"
              />
            </label>
          ))}
        </div>

        <Button
          disabled={!reviewTypeId || sidePositions.length === 0 || isSharing}
          onClick={() => void createShare()}
        >
          <Bot size={15} /> {isSharing ? "Creation..." : "Creer le lien Markdown"}
        </Button>
      </div>
    </Modal>
  );
}
