import { ArrowRight, BookOpen, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../design-system";
import { formatLastReview } from "../shared/format";
import { navigate } from "../shared/navigation";
import { useCreateDeckMutation, useDecksQuery } from "./deck-queries";
import { NewDeckModal } from "./new-deck-modal";

export function DecksPage() {
  const [creating, setCreating] = useState(false);
  const decksQuery = useDecksQuery();
  const createDeckMutation = useCreateDeckMutation();
  const decks = decksQuery.data ?? [];

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
          <Button variant="ghost" size="icon" aria-label="Menu">
            <MoreHorizontal size={18} />
          </Button>
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
