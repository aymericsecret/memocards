import { Brain, CalendarCheck, CreditCard, RotateCcw, TrendingUp, Zap } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Modal, ModalHeader } from "../design-system";
import type { CardDetail, Tag } from "../shared/types";
import { CardTagPicker } from "./card-tag-picker";
import { useCardDetailQuery } from "./card-queries";

interface CardDetailModalProps {
  allTags?: Tag[];
  cardId: string | null;
  deckId?: string;
  onClose: () => void;
}

const statusLabels = {
  known: "Acquise",
  learning: "En apprentissage",
  new: "Nouvelle"
};

const stateLabels = ["Nouvelle", "En apprentissage", "En revision", "Reapprentissage"];
const ratingLabels = ["", "A revoir", "Difficile", "Bien", "Facile"];

export function CardDetailModal({ allTags = [], cardId, deckId, onClose }: CardDetailModalProps) {
  const detailQuery = useCardDetailQuery(cardId);
  const card = detailQuery.data ?? null;

  if (!cardId) return null;

  return (
    <Modal labelledBy="card-detail-title" onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <h2 id="card-detail-title">Detail de la carte</h2>
      </ModalHeader>
      {detailQuery.isLoading || !card ? (
        <p className="modal-description">Chargement...</p>
      ) : (
        <CardDetailContent allTags={allTags} card={card} deckId={deckId} />
      )}
    </Modal>
  );
}

function CardDetailContent({
  allTags,
  card,
  deckId
}: {
  allTags: Tag[];
  card: CardDetail;
  deckId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"card" | "stats">("card");
  const lastReview = card.lastReview
    ? new Date(card.lastReview).toLocaleString("fr-FR", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "Jamais";
  const totalLapses = card.reviewStates.reduce((sum, state) => sum + state.lapses, 0);

  return (
    <div className="card-detail-body">
      <div className="modal-tabs-list card-detail-tabs">
        <button
          className={activeTab === "card" ? "modal-tab active" : "modal-tab"}
          onClick={() => setActiveTab("card")}
          type="button"
        >
          <CreditCard size={14} /> Carte
        </button>
        <button
          className={activeTab === "stats" ? "modal-tab active" : "modal-tab"}
          onClick={() => setActiveTab("stats")}
          type="button"
        >
          <Brain size={14} /> Stats
        </button>
      </div>

      {activeTab === "card" ? (
        <section className="card-detail-preview">
          {card.sides.map((side) => (
            <div key={side.id}>
              <p>{side.label}</p>
              <strong>{side.content || "-"}</strong>
            </div>
          ))}
          <div>
            <p>Tags</p>
            {deckId ? (
              <CardTagPicker
                allTags={allTags}
                cardId={card.id}
                cardTags={card.tags}
                deckId={deckId}
              />
            ) : card.tags.length > 0 ? (
              <div className="tag-chip-list">
                {card.tags.map((tag) => (
                  <span className="tag-chip" key={tag.id}>
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <strong>-</strong>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="card-stat-grid">
            <StatItem icon={<RotateCcw size={15} />} label="Revisions totales" value={String(card.reviewCount)} />
            <StatItem icon={<Zap size={15} />} label="Erreurs" value={String(totalLapses)} />
            <StatItem icon={<CalendarCheck size={15} />} label="Derniere revision" value={lastReview} small />
            <StatItem icon={<TrendingUp size={15} />} label="Types actifs" value={String(card.reviewStates.length)} />
          </section>

          {card.reviewStates.length === 0 ? (
            <p className="modal-description">Cette carte n'a pas encore ete revisee.</p>
          ) : (
            <section className="review-state-list">
              <p className="detail-section-title">Par type de revision</p>
              {card.reviewStates.map((state) => (
                <article className="review-state-card" key={state.reviewTypeId}>
                  <div>
                    <strong>{state.reviewTypeName}</strong>
                    <span>{statusLabels[state.learningStatus]}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Etat</dt>
                      <dd>{stateLabels[state.state] ?? "Nouvelle"}</dd>
                    </div>
                    <div>
                      <dt>Prochaine</dt>
                      <dd>
                        {new Date(state.due).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>Repetitions</dt>
                      <dd>{state.reps}</dd>
                    </div>
                    <div>
                      <dt>Lapses</dt>
                      <dd>{state.lapses}</dd>
                    </div>
                    <div>
                      <dt>Stabilite</dt>
                      <dd>{state.stability.toFixed(1)}j</dd>
                    </div>
                    <div>
                      <dt>Difficulte</dt>
                      <dd>{Math.round(Math.min(100, (state.difficulty / 10) * 100))}%</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </section>
          )}

          {card.recentRatings.length > 0 && (
            <section>
              <p className="detail-section-title">Dernieres evaluations</p>
              <div className="rating-chip-list">
                {card.recentRatings.map((rating, index) => (
                  <span key={`${rating.reviewedAt}-${index}`}>
                    {ratingLabels[rating.rating] ?? rating.rating}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatItem({
  icon,
  label,
  small = false,
  value
}: {
  icon: ReactNode;
  label: string;
  small?: boolean;
  value: string;
}) {
  return (
    <div className="card-stat-item">
      {icon}
      <div>
        <p>{label}</p>
        <strong className={small ? "small-value" : ""}>{value}</strong>
      </div>
    </div>
  );
}
