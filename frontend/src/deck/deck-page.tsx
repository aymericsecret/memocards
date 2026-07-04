import { ArrowLeft, BarChart3, ListChecks, Play, Plus, TableIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCardSidesPayload,
  useCreateCardMutation,
  useDeckCardsQuery,
  useDeleteCardMutation,
  useUpdateCardMutation
} from "../cards/card-queries";
import { CardFilters } from "../cards/card-filters";
import { CardDetailModal } from "../cards/card-detail-modal";
import { CardTable } from "../cards/card-table";
import { NewCardModal } from "../cards/new-card-modal";
import { ActionMenu, ActionMenuItem, Button, ConfirmDialog } from "../design-system";
import { ReviewTypesTab } from "../review/review-types-tab";
import { useReviewTypesQuery } from "../review/review-type-queries";
import { navigate } from "../shared/navigation";
import type { CardRow, SideTemplate } from "../shared/types";
import { DeckActionsMenu } from "./deck-actions-menu";
import { useDeckQuery, useDeleteDeckMutation } from "./deck-queries";
import { DeckStatsTab } from "./deck-stats-tab";

export function DeckPage({ deckId }: { deckId: string }) {
  const [activeTab, setActiveTab] = useState<"cards" | "review-types" | "stats">("cards");
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CardRow | null>(null);
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [newRow, setNewRow] = useState<Record<number, string>>({});
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "last_review">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sideFilters, setSideFilters] = useState<Record<number, "filled" | "empty">>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const deckQuery = useDeckQuery(deckId);
  const reviewTypesQuery = useReviewTypesQuery(deckId);
  const deck = deckQuery.data ?? null;

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

  const cardFilters = useMemo(
    () => ({
      search: debouncedSearch,
      selectedStatuses,
      selectedTagIds,
      sideEmpty,
      sideFilled,
      sortDir,
      sortField,
      reviewTypeId: deck?.defaultReviewTypeId ?? null
    }),
    [
      debouncedSearch,
      selectedStatuses,
      selectedTagIds,
      sideEmpty,
      sideFilled,
      sortDir,
      sortField,
      deck?.defaultReviewTypeId
    ]
  );

  const cardsQuery = useDeckCardsQuery(deckId, cardFilters);
  const cards = cardsQuery.data?.cards ?? [];
  const totalCount = cardsQuery.data?.totalCount ?? 0;
  const reviewTypes = reviewTypesQuery.data ?? [];
  const defaultReviewType =
    reviewTypes.find((reviewType) => reviewType.isDefault) ??
    reviewTypes.find((reviewType) => reviewType.id === deck?.defaultReviewTypeId) ??
    null;
  const createCardMutation = useCreateCardMutation(deckId);
  const updateCardMutation = useUpdateCardMutation(deckId);
  const deleteCardMutation = useDeleteCardMutation(deckId);
  const deleteDeckMutation = useDeleteDeckMutation();

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

    await createCardMutation.mutateAsync({
      sides: createCardSidesPayload(templates, newRow),
      tagIds: newTagIds
    });

    setNewRow({});
    setNewTagIds([]);
    setTimeout(() => focusCell("__new__", 0), 50);
  };

  const addCardFromModal = async (
    sides: Array<{ content: string; label: string; position: number }>,
    tagIds: string[]
  ) => {
    await createCardMutation.mutateAsync({ sides, tagIds });
  };

  const updateCardSide = async (
    card: CardRow,
    template: SideTemplate,
    content: string
  ) => {
    const existingSide = card.sides.find((side) => side.position === template.position);
    if (existingSide?.content === content) return;

    await updateCardMutation.mutateAsync({
      cardId: card.id,
      sides: [
        {
          position: template.position,
          label: template.label,
          content
        }
      ]
    });
  };

  const deleteSelectedCard = async () => {
    if (!cardToDelete) return;
    await deleteCardMutation.mutateAsync(cardToDelete.id);
    setCardToDelete(null);
  };

  if (deckQuery.isLoading && !deck) {
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
          <Button
            className="mobile-only"
            size="icon"
            onClick={() => setIsNewCardModalOpen(true)}
            aria-label="Ajouter une carte"
          >
            <Plus size={18} />
          </Button>
          <DeckActionsMenu
            cards={cards}
            deckName={deck.name}
            templates={templates}
            onDeleteDeck={() => setIsDeleteDeckOpen(true)}
          />
        </div>
      </header>

      <main className="container deck-main">
        <div className="deck-heading-row">
          <div className="deck-heading">
            <h1>{deck.name}</h1>
            {deck.description && <p>{deck.description}</p>}
            <p className="mobile-count">
              {totalCount} carte{totalCount !== 1 ? "s" : ""}
            </p>
          </div>
          {defaultReviewType && (
            <div
              className={
                reviewTypes.length > 1
                  ? "deck-start-review-group has-review-type-menu"
                  : "deck-start-review-group"
              }
            >
              <Button
                className="deck-start-review"
                disabled={defaultReviewType.dueCount === 0}
                onClick={() => navigate(`/review-type/${defaultReviewType.id}`)}
              >
                <Play size={16} fill="currentColor" />
                Reviser
                <span>{defaultReviewType.dueCount}</span>
              </Button>
              {reviewTypes.length > 1 && (
                <ActionMenu className="deck-review-type-menu" label="Choisir le type de revision">
                  {reviewTypes.map((reviewType) => (
                    <ActionMenuItem
                      disabled={reviewType.dueCount === 0}
                      key={reviewType.id}
                      onClick={() => navigate(`/review-type/${reviewType.id}`)}
                    >
                      <Play size={14} fill="currentColor" />
                      <span className="review-type-menu-label">{reviewType.name}</span>
                      <span className="review-type-menu-count">{reviewType.dueCount}</span>
                    </ActionMenuItem>
                  ))}
                </ActionMenu>
              )}
            </div>
          )}
        </div>

        <div className="tabs-list">
          <button
            className={activeTab === "cards" ? "tab active" : "tab"}
            onClick={() => setActiveTab("cards")}
          >
            <TableIcon size={14} /> Cartes
          </button>
          <button
            className={activeTab === "review-types" ? "tab active" : "tab"}
            onClick={() => setActiveTab("review-types")}
          >
            <ListChecks size={14} /> Types de revision
          </button>
          <button
            className={activeTab === "stats" ? "tab active" : "tab"}
            onClick={() => setActiveTab("stats")}
          >
            <BarChart3 size={14} /> Statistiques
          </button>
        </div>

        {activeTab === "cards" ? (
          <>
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
              allTags={deck.tags}
              cards={cards}
              deckId={deckId}
              newRow={newRow}
              newTagIds={newTagIds}
              tableRef={tableRef}
              templates={templates}
              totalCount={totalCount}
              onAddCard={() => void addCard()}
              onDeleteCard={setCardToDelete}
              onFocusCell={focusCell}
              onNewRowChange={setNewRow}
              onNewTagIdsChange={setNewTagIds}
              onOpenCard={setSelectedCardId}
              onUpdateCardSide={(card, template, content) =>
                void updateCardSide(card, template, content)
              }
            />
          </>
        ) : activeTab === "review-types" ? (
          <ReviewTypesTab
            deckId={deckId}
            reviewTypes={reviewTypes}
            tags={deck.tags}
            templates={templates}
          />
        ) : (
          <DeckStatsTab deckId={deckId} />
        )}
      </main>

      <NewCardModal
        allTags={deck.tags}
        deckId={deckId}
        isOpen={isNewCardModalOpen}
        templates={templates}
        onClose={() => setIsNewCardModalOpen(false)}
        onCreateCard={addCardFromModal}
      />
      <CardDetailModal
        allTags={deck.tags}
        cardId={selectedCardId}
        deckId={deckId}
        onClose={() => setSelectedCardId(null)}
      />
      {cardToDelete && (
        <ConfirmDialog
          description="Cette carte, ses tags et toute sa progression de revision seront definitivement supprimes."
          isPending={deleteCardMutation.isPending}
          labelledBy="delete-card-title"
          title="Supprimer cette carte ?"
          onCancel={() => setCardToDelete(null)}
          onConfirm={() => void deleteSelectedCard()}
        />
      )}
      {isDeleteDeckOpen && (
        <ConfirmDialog
          description={`Le paquet "${deck.name}", ses cartes, ses tags et toute sa progression seront definitivement supprimes. Cette action est irreversible.`}
          isPending={deleteDeckMutation.isPending}
          labelledBy="delete-deck-title"
          title="Supprimer ce paquet ?"
          onCancel={() => setIsDeleteDeckOpen(false)}
          onConfirm={() => void deleteDeckMutation.mutateAsync(deckId)}
        />
      )}
    </div>
  );
}
