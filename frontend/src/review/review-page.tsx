import {
  ArrowLeft,
  Check,
  Pencil,
  Loader2,
  Minus,
  Square,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CardTagPicker } from "../cards/card-tag-picker";
import { createCardSidesPayload, useUpdateCardMutation } from "../cards/card-queries";
import { Button, Field, Modal, ModalHeader } from "../design-system";
import { useDeckQuery } from "../deck/deck-queries";
import { navigate } from "../shared/navigation";
import type { ReviewCard, SideTemplate, Tag } from "../shared/types";
import {
  useDueReviewCardsQuery,
  useReviewTypeQuery,
  useSubmitReviewMutation
} from "./review-type-queries";

type Rating = 1 | 2 | 3 | 4;

const stateLabels = ["Nouvelle", "En apprentissage", "En revision", "Reapprentissage"];

const ratingActions: Array<{
  className: string;
  icon: typeof X;
  label: string;
  rating: Rating;
}> = [
  { className: "rating-again", icon: X, label: "A revoir", rating: 1 },
  { className: "rating-hard", icon: Minus, label: "Difficile", rating: 2 },
  { className: "rating-good", icon: Check, label: "Bien", rating: 3 },
  { className: "rating-easy", icon: Zap, label: "Facile", rating: 4 }
];

export function ReviewPage({ reviewTypeId }: { reviewTypeId: string }) {
  const groups = new URLSearchParams(window.location.search).get("groups");
  const reviewTypeQuery = useReviewTypeQuery(reviewTypeId);
  const reviewType = reviewTypeQuery.data ?? null;
  const deckQuery = useDeckQuery(reviewType?.deckId ?? null);
  const deck = deckQuery.data ?? null;
  const cardsQuery = useDueReviewCardsQuery(reviewTypeId, groups);
  const submitReviewMutation = useSubmitReviewMutation(reviewTypeId, reviewType?.deckId ?? null);
  const updateCardMutation = useUpdateCardMutation(reviewType?.deckId ?? "");
  const [reviewedCardIds, setReviewedCardIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<ReviewCard | null>(null);

  const pendingCards = useMemo(
    () =>
      (cardsQuery.data?.cards ?? []).filter(
        (card) => !reviewedCardIds.includes(card.cardId)
      ),
    [cardsQuery.data?.cards, reviewedCardIds]
  );
  const current = pendingCards[0] ?? null;
  const editableCard = editingCard
    ? pendingCards.find((card) => card.cardId === editingCard.cardId) ?? editingCard
    : null;
  const totalDue = cardsQuery.data?.totalCount ?? 0;
  const reviewedCount = reviewedCardIds.length;
  const backPath = reviewType?.deckId ? `/deck/${reviewType.deckId}` : "/";

  const finish = () => {
    setFinished(true);
    setShowStopDialog(false);
  };

  const submitRating = async (card: ReviewCard, rating: Rating) => {
    await submitReviewMutation.mutateAsync({
      cardId: card.cardId,
      rating
    });
    setReviewedCardIds((ids) => [...ids, card.cardId]);
    setRevealed(false);

    if (pendingCards.length <= 1) {
      const refreshed = await cardsQuery.refetch();
      const nextCards = (refreshed.data?.cards ?? []).filter(
        (candidate) =>
          candidate.cardId !== card.cardId && !reviewedCardIds.includes(candidate.cardId)
      );
      if (nextCards.length === 0) setFinished(true);
    }
  };

  const updateReviewCard = async (
    card: ReviewCard,
    sides: Array<{ content: string; label: string; position: number }>
  ) => {
    await updateCardMutation.mutateAsync({
      cardId: card.cardId,
      sides
    });
    await cardsQuery.refetch();
    setEditingCard(null);
  };

  if (finished) {
    return (
      <div className="review-complete-page">
        <div className="review-complete">
          <div className="success-ring">
            <Check size={34} />
          </div>
          <h1>Session terminee !</h1>
          <p>
            {reviewedCount} carte{reviewedCount !== 1 ? "s" : ""} revisee
            {reviewedCount !== 1 ? "s" : ""}
          </p>
          <Button onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} /> Retour
          </Button>
        </div>
      </div>
    );
  }

  if (reviewTypeQuery.isLoading || cardsQuery.isLoading || !reviewType) {
    return (
      <div className="loading-page">
        <Loader2 className="spin" size={18} /> Chargement...
      </div>
    );
  }

  if (!current) {
    return (
      <div className="review-complete-page">
        <div className="review-complete">
          <div className="success-ring">
            <Check size={34} />
          </div>
          <h1>Aucune carte a reviser</h1>
          <p>Ce type de revision est a jour.</p>
          <Button onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} /> Retour
          </Button>
        </div>
      </div>
    );
  }

  const frontSide =
    current.sides.find((side) => side.position === reviewType.frontSidePosition) ??
    current.sides[0];
  const otherSides = current.sides.filter((side) => side.id !== frontSide?.id);
  const displayPosition = Math.min(reviewedCount + 1, Math.max(totalDue, reviewedCount + 1));
  const displayTotal = Math.max(totalDue, reviewedCount + 1);

  return (
    <div className="review-shell">
      <header className="review-topbar">
        <div className="review-topbar-inner">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)} aria-label="Retour">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <p>{reviewType.name}</p>
            <span>
              {displayPosition} / {displayTotal} · {stateLabels[current.state] ?? ""}
            </span>
          </div>
          <Button
            className="stop-button"
            variant="outline"
            size="sm"
            onClick={() => setShowStopDialog(true)}
          >
            <Square size={14} fill="currentColor" /> Arreter
          </Button>
        </div>
      </header>

      <main className="review-main">
        <section className="review-card review-question-card">
          {frontSide && (
            <>
              <p>{frontSide.label}</p>
              <h1>{frontSide.content || "-"}</h1>
            </>
          )}
        </section>

        {!revealed ? (
          <Button className="reveal-button" onClick={() => setRevealed(true)}>
            Reveler
          </Button>
        ) : (
          <>
            <section className="review-card review-answer-card">
              {otherSides.map((side) => (
                <div key={side.id}>
                  <p>{side.label}</p>
                  <h2>{side.content || "-"}</h2>
                </div>
              ))}
            </section>

            <div className="review-card-actions">
              <Button variant="outline" size="sm" onClick={() => setEditingCard(current)}>
                <Pencil size={14} /> Modifier
              </Button>
              {deck && (
                <div className="review-tag-shortcut">
                  <span>Tags</span>
                  <CardTagPicker
                    allTags={deck.tags}
                    cardId={current.cardId}
                    cardTags={current.tags}
                    deckId={deck.id}
                  />
                </div>
              )}
            </div>

            <div className="rating-grid">
              {ratingActions.map(({ className, icon: Icon, label, rating }) => (
                <Button
                  className={className}
                  disabled={submitReviewMutation.isPending}
                  key={rating}
                  variant="outline"
                  onClick={() => void submitRating(current, rating)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </>
        )}
      </main>

      {showStopDialog && (
        <Modal labelledBy="stop-review-title" onClose={() => setShowStopDialog(false)}>
          <ModalHeader onClose={() => setShowStopDialog(false)}>
            <h2 id="stop-review-title">Arreter la revision ?</h2>
          </ModalHeader>
          <p className="modal-description">
            Vous avez revise {reviewedCount} carte{reviewedCount !== 1 ? "s" : ""}. Les cartes
            restantes seront toujours disponibles pour la prochaine session.
          </p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>
              Continuer
            </Button>
            <Button className="danger-primary" onClick={finish}>
              Arreter
            </Button>
          </div>
        </Modal>
      )}

      {editingCard && editableCard && (
        <ReviewCardEditModal
          allTags={deck?.tags ?? []}
          card={editableCard}
          deckId={deck?.id ?? ""}
          isSaving={updateCardMutation.isPending}
          templates={deck?.sideTemplates ?? editableCard.sides}
          onClose={() => setEditingCard(null)}
          onSave={(sides) => void updateReviewCard(editingCard, sides)}
        />
      )}
    </div>
  );
}

function ReviewCardEditModal({
  allTags,
  card,
  deckId,
  isSaving,
  onClose,
  onSave,
  templates
}: {
  allTags: Tag[];
  card: ReviewCard;
  deckId: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (sides: Array<{ content: string; label: string; position: number }>) => void;
  templates: SideTemplate[];
}) {
  const [values, setValues] = useState<Record<number, string>>({});

  useEffect(() => {
    setValues(
      Object.fromEntries(card.sides.map((side) => [side.position, side.content]))
    );
  }, [card]);

  const filledSidesCount = Object.values(values).filter((value) => value.trim()).length;

  return (
    <Modal labelledBy="review-edit-card-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="review-edit-card-title">Modifier la carte</h2>
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

      {deckId && (
        <Field label="Tags">
          <CardTagPicker
            allTags={allTags}
            cardId={card.cardId}
            cardTags={card.tags}
            deckId={deckId}
          />
        </Field>
      )}

      <Button
        className="modal-submit"
        disabled={filledSidesCount < 2 || isSaving}
        onClick={() => onSave(createCardSidesPayload(templates, values))}
      >
        {isSaving ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
        Enregistrer
      </Button>
    </Modal>
  );
}
