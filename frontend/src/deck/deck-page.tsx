import { ArrowLeft, MoreHorizontal, TableIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardFilters } from "../cards/card-filters";
import { CardTable } from "../cards/card-table";
import { Button } from "../design-system";
import { api } from "../shared/api";
import { navigate } from "../shared/navigation";
import type { CardRow, DeckDetail, SideTemplate } from "../shared/types";

export function DeckPage({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "last_review">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sideFilters, setSideFilters] = useState<Record<number, "filled" | "empty">>({});
  const tableRef = useRef<HTMLDivElement>(null);

  const templates = useMemo(
    () =>
      deck?.sideTemplates.length
        ? deck.sideTemplates
        : [
            { id: "0", label: "Recto", position: 0 },
            { id: "1", label: "Verso", position: 1 }
          ],
    [deck]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const sideFilled = useMemo(
    () =>
      Object.entries(sideFilters)
        .filter(([, value]) => value === "filled")
        .map(([position]) => Number(position)),
    [sideFilters]
  );

  const sideEmpty = useMemo(
    () =>
      Object.entries(sideFilters)
        .filter(([, value]) => value === "empty")
        .map(([position]) => Number(position)),
    [sideFilters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({
      pageSize: "100",
      sortField,
      sortDir
    });

    if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
    if (selectedTagIds.length) query.set("tagIds", selectedTagIds.join(","));
    if (selectedStatuses.length) {
      query.set("statuses", selectedStatuses.join(","));
      if (deck?.defaultReviewTypeId) {
        query.set("reviewTypeId", deck.defaultReviewTypeId);
      }
    }
    if (sideFilled.length) query.set("sideFilled", sideFilled.join(","));
    if (sideEmpty.length) query.set("sideEmpty", sideEmpty.join(","));

    const [deckData, cardData] = await Promise.all([
      api<{ deck: DeckDetail }>(`/decks/${deckId}`),
      api<{ cards: CardRow[]; totalCount: number }>(
        `/decks/${deckId}/cards?${query.toString()}`
      )
    ]);

    setDeck(deckData.deck);
    setCards(cardData.cards);
    setTotalCount(cardData.totalCount);
    setLoading(false);
  }, [
    deckId,
    debouncedSearch,
    sortField,
    sortDir,
    selectedTagIds,
    selectedStatuses,
    sideFilled,
    sideEmpty,
    deck?.defaultReviewTypeId
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const focusCell = useCallback((row: string, col: number) => {
    const next = tableRef.current?.querySelector<HTMLInputElement>(
      `input[data-row="${row}"][data-col="${col}"]`
    );
    next?.focus();
    next?.select();
  }, []);

  const addCard = async () => {
    const filled = Object.values(newRow).filter((value) => value.trim()).length;
    if (filled < 2) return;

    await api(`/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify({
        sides: templates.map((template) => ({
          position: template.position,
          label: template.label,
          content: newRow[template.position] ?? ""
        }))
      })
    });

    setNewRow({});
    await load();
    setTimeout(() => focusCell("__new__", 0), 50);
  };

  const updateCardSide = async (
    card: CardRow,
    template: SideTemplate,
    content: string
  ) => {
    const existingSide = card.sides.find((side) => side.position === template.position);
    if (existingSide?.content === content) return;

    setCards((currentCards) =>
      currentCards.map((currentCard) =>
        currentCard.id === card.id
          ? {
              ...currentCard,
              sides: [
                ...currentCard.sides.filter((side) => side.position !== template.position),
                {
                  id: existingSide?.id ?? `${card.id}-${template.position}`,
                  label: template.label,
                  position: template.position,
                  content
                }
              ].sort((a, b) => a.position - b.position)
            }
          : currentCard
      )
    );

    await api(`/cards/${card.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        sides: [
          {
            position: template.position,
            label: template.label,
            content
          }
        ]
      })
    });
  };

  const deleteCard = async (cardId: string) => {
    await api(`/cards/${cardId}`, { method: "DELETE" });
    await load();
  };

  if (loading && !deck) {
    return <div className="loading-page">Chargement...</div>;
  }

  if (!deck) {
    return <div className="loading-page">Paquet introuvable</div>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container deck-topbar">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Retour">
            <ArrowLeft size={18} />
          </Button>
          <span className="card-count">
            {totalCount} carte{totalCount !== 1 ? "s" : ""}
          </span>
          <Button className="push-right" variant="ghost" size="icon" aria-label="Menu">
            <MoreHorizontal size={18} />
          </Button>
        </div>
      </header>

      <main className="container deck-main">
        <div className="deck-heading">
          <h1>{deck.name}</h1>
          {deck.description && <p>{deck.description}</p>}
          <p className="mobile-count">
            {totalCount} carte{totalCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="tabs-list">
          <button className="tab active">
            <TableIcon size={14} /> Cartes
          </button>
        </div>

        <CardFilters
          search={search}
          selectedStatuses={selectedStatuses}
          selectedTagIds={selectedTagIds}
          sideFilters={sideFilters}
          sortDir={sortDir}
          sortField={sortField}
          tags={deck.tags}
          templates={templates}
          onSearchChange={setSearch}
          onSelectedStatusesChange={setSelectedStatuses}
          onSelectedTagIdsChange={setSelectedTagIds}
          onSideFiltersChange={setSideFilters}
          onSortChange={(field, dir) => {
            setSortField(field);
            setSortDir(dir);
          }}
        />

        <CardTable
          cards={cards}
          newRow={newRow}
          tableRef={tableRef}
          templates={templates}
          totalCount={totalCount}
          onAddCard={() => void addCard()}
          onDeleteCard={(cardId) => void deleteCard(cardId)}
          onFocusCell={focusCell}
          onNewRowChange={setNewRow}
          onUpdateCardSide={(card, template, content) =>
            void updateCardSide(card, template, content)
          }
        />
      </main>
    </div>
  );
}
