import { ArrowRight, BookOpen, Play, Plus, Settings, Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/auth-context";
import { Button } from "../design-system";
import { formatLastReview } from "../shared/format";
import { navigate } from "../shared/navigation";
import type { ReviewType } from "../shared/types";
import { useCreateDeckMutation, useDecksQuery } from "./deck-queries";
import { NewDeckModal } from "./new-deck-modal";

type GroupKey = keyof ReviewType["groups"];

const groupLabels: Array<[GroupKey, string]> = [
  ["new", "Nouvelles"],
  ["now", "Maintenant"],
  ["in1h", "< 1h"],
  ["in24h", "< 24h"],
  ["tomorrow", "Demain"],
  ["inWeek", "< 1 sem."],
  ["later", "> 1 sem."]
];

const groupColors: Record<GroupKey, string> = {
  new: "hsl(210 80% 65%)",
  now: "hsl(355 85% 68%)",
  in1h: "hsl(20 90% 65%)",
  in24h: "hsl(40 90% 62%)",
  tomorrow: "hsl(150 70% 55%)",
  inWeek: "hsl(180 60% 55%)",
  later: "hsl(260 55% 70%)"
};

export function DecksPage() {
  const auth = useAuth();
  const [creating, setCreating] = useState(false);
  const [selectionMap, setSelectionMap] = useState<Record<string, GroupKey[]>>({});
  const decksQuery = useDecksQuery();
  const createDeckMutation = useCreateDeckMutation();
  const decks = decksQuery.data ?? [];

  const selectedCount = (reviewType: ReviewType) =>
    (selectionMap[reviewType.id] ?? []).reduce(
      (sum, key) => sum + reviewType.groups[key],
      0
    );

  const startReview = (reviewType: ReviewType) => {
    const selected = selectionMap[reviewType.id] ?? [];
    const query = new URLSearchParams();
    if (selected.length > 0) query.set("groups", selected.join(","));
    navigate(`/review-type/${reviewType.id}${query.toString() ? `?${query.toString()}` : ""}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <BookOpen size={16} />
            </div>
            <h1>Memora</h1>
          </div>
          <div className="topbar-user">
            <span>{auth.user?.displayName || auth.user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reglages du compte"
              onClick={() => navigate("/account")}
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container dashboard-main">
        <div className="section-heading">
          <div>
            <h2>Mes paquets</h2>
            <p>
              {decks.length > 0
                ? `${decks.length} paquet${decks.length > 1 ? "s" : ""} actif${decks.length > 1 ? "s" : ""}`
                : "Aucun paquet"}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> Nouveau
          </Button>
        </div>

        {decksQuery.isLoading ? (
          <p className="muted">Chargement...</p>
        ) : decks.length === 0 ? (
          <section className="empty-card">
            <BookOpen size={40} />
            <p>Aucun paquet pour l'instant</p>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> Creer un paquet
            </Button>
          </section>
        ) : (
          <div className="deck-list">
            {decks.map((deck) => (
              <article className="deck-card" key={deck.id}>
                <div className="deck-card-header">
                  <div className="deck-title-row">
                    <div className="deck-icon">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3>{deck.name}</h3>
                      <p>
                        {deck.stats.totalCards} carte
                        {deck.stats.totalCards !== 1 ? "s" : ""} ·{" "}
                        {formatLastReview(deck.stats.lastReview)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/deck/${deck.id}`)}>
                    Ouvrir <ArrowRight size={14} />
                  </Button>
                </div>
                <div className="deck-card-reviews">
                  {deck.reviewTypes.length === 0 ? (
                    <p className="deck-review-empty">
                      Aucun type de revision - ouvrez le paquet pour en creer un.
                    </p>
                  ) : (
                    deck.reviewTypes.map((reviewType) => {
                      const selected = selectionMap[reviewType.id] ?? [];
                      const count = selected.length > 0 ? selectedCount(reviewType) : reviewType.dueCount;

                      return (
                        <div className="deck-review-row" key={reviewType.id}>
                          <div className="deck-review-row-head">
                            <div className="deck-review-title">
                              <h4>{reviewType.name}</h4>
                              {reviewType.isDefault && (
                                <Star size={14} className="default-star" fill="currentColor" />
                              )}
                            </div>
                            <div className="deck-review-start">
                              <span className={count > 0 ? "" : "muted-count"}>{count}</span>
                              <button
                                aria-label="Reviser"
                                disabled={count === 0}
                                onClick={() => startReview(reviewType)}
                                type="button"
                              >
                                <Play size={14} fill="currentColor" />
                              </button>
                            </div>
                          </div>
                          <DashboardReviewGroupsBar
                            groups={reviewType.groups}
                            selected={new Set(selected)}
                            onSelectionChange={(next) =>
                              setSelectionMap((previous) => ({
                                ...previous,
                                [reviewType.id]: Array.from(next)
                              }))
                            }
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {creating && (
        <NewDeckModal
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            createDeckMutation.mutate(input, {
              onSuccess: () => setCreating(false)
            });
          }}
        />
      )}
    </div>
  );
}

function DashboardReviewGroupsBar({
  groups,
  selected,
  onSelectionChange
}: {
  groups: ReviewType["groups"];
  selected: Set<GroupKey>;
  onSelectionChange: (selected: Set<GroupKey>) => void;
}) {
  const total = Object.values(groups).reduce((sum, value) => sum + value, 0);

  if (total === 0) return null;

  const toggleGroup = (key: GroupKey) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className="dashboard-review-groups">
      <div className="dashboard-review-groups-stacked" aria-label="Repartition des revisions">
        {groupLabels.map(([key, label]) => {
          const count = groups[key];
          if (count === 0) return null;
          const isSelected = selected.has(key);

          return (
            <button
              key={key}
              title={`${label}: ${count}`}
              onClick={() => toggleGroup(key)}
              style={{
                backgroundColor: groupColors[key],
                opacity: selected.size === 0 || isSelected ? 1 : 0.25,
                width: `${(count / total) * 100}%`
              }}
              type="button"
            />
          );
        })}
      </div>
      <div className="dashboard-review-groups-legend">
        {groupLabels.map(([key, label]) => {
          const count = groups[key];
          if (count === 0) return null;
          const isSelected = selected.has(key);

          return (
            <button
              className={isSelected ? "selected" : ""}
              key={key}
              onClick={() => toggleGroup(key)}
              style={{ opacity: selected.size === 0 || isSelected ? 1 : 0.4 }}
              type="button"
            >
              <span style={{ backgroundColor: groupColors[key] }} />
              {label} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
