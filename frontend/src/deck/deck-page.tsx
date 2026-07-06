import { ArrowLeft, BarChart3, Check, ListChecks, Play, Plus, TableIcon } from "lucide-react";
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
import { ActionMenu, ActionMenuItem, Button, ConfirmDialog, FilterMenu } from "../design-system";
import { ReviewTypesTab } from "../review/review-types-tab";
import { useReviewTypesQuery } from "../review/review-type-queries";
import { navigate } from "../shared/navigation";
import type { CardRow, SideTemplate } from "../shared/types";
import { DeckActionsMenu } from "./deck-actions-menu";
import { DeckShareModal } from "./deck-share-modal";
import { useDeckQuery, useDeleteDeckMutation } from "./deck-queries";
import { DeckSettingsModal } from "./deck-settings-modal";
import { DeckStatsTab } from "./deck-stats-tab";
import { DeckTagsModal } from "./deck-tags-modal";

export function DeckPage({ deckId }: { deckId: string }) {
  const [activeTab, setActiveTab] = useState<"cards" | "review-types" | "stats">("cards");
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CardRow | null>(null);
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [isDeckSettingsOpen, setIsDeckSettingsOpen] = useState(false);
  const [isDeckShareOpen, setIsDeckShareOpen] = useState(false);
  const [isDeckTagsOpen, setIsDeckTagsOpen] = useState(false);
  const [newRow, setNewRow] = useState<Record<number, string>>({});
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "last_review">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sideFilters, setSideFilters] = useState<Record<number, "filled" | "empty">>({});
  const [cardsPage, setCardsPage] = useState(0);
  const cardsPageSize = 100;
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
      page: cardsPage,
      pageSize: cardsPageSize,
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
      cardsPage,
      cardsPageSize,
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

  useEffect(() => {
    setCardsPage(0);
  }, [
    debouncedSearch,
    selectedStatuses,
    selectedTagIds,
    sideEmpty,
    sideFilled,
    sortDir,
    sortField,
    deck?.defaultReviewTypeId
  ]);

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
  const deckTabs: Array<{
    icon: typeof TableIcon;
    label: string;
    value: "cards" | "review-types" | "stats";
  }> = [
    { icon: TableIcon, label: "Cartes", value: "cards" },
    { icon: ListChecks, label: "Types de revision", value: "review-types" },
    { icon: BarChart3, label: "Statistiques", value: "stats" }
  ];
  const activeTabLabel =
    deckTabs.find((tab) => tab.value === activeTab)?.label ?? "Cartes";

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

  const reviewStartControl = defaultReviewType ? (
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
        <span className="review-button-label">Reviser</span>
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
  ) : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container deck-topbar">
          <div className="deck-topbar-left">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Retour">
              <ArrowLeft size={18} />
            </Button>
            <div className="deck-topbar-title">
              <h1>{deck.name}</h1>
              <span>
                {totalCount} carte{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="deck-topbar-actions">
            {reviewStartControl}
            <DeckActionsMenu
              cards={cards}
              deckName={deck.name}
              templates={templates}
              onDeleteDeck={() => setIsDeleteDeckOpen(true)}
              onOpenSettings={() => setIsDeckSettingsOpen(true)}
              onOpenShare={() => setIsDeckShareOpen(true)}
              onOpenTags={() => setIsDeckTagsOpen(true)}
            />
          </div>
        </div>
      </header>

      <main className={activeTab === "cards" ? "container deck-main cards-mode" : "container deck-main"}>
        <div className="mobile-deck-heading">
          <h1>{deck.name}</h1>
          <span>
            {totalCount} carte{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        {deck.description && <p className="deck-description">{deck.description}</p>}

        <div className="mobile-tabs-menu">
          <FilterMenu align="left" label={activeTabLabel}>
            <div className="filter-panel compact">
              {deckTabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.value;

                return (
                  <button
                    className={selected ? "option-row selected" : "option-row"}
                    data-close-menu
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    type="button"
                  >
                    <span className="tab-dropdown-label">
                      <Icon size={14} /> {tab.label}
                    </span>
                    {selected && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </FilterMenu>
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
          <div className="cards-tab-content">
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

            <Button
              className="mobile-create-card-button"
              onClick={() => setIsNewCardModalOpen(true)}
            >
              <Plus size={16} /> Creer une carte
            </Button>

            <CardTable
              allTags={deck.tags}
              cards={cards}
              deckId={deckId}
              isFetching={cardsQuery.isFetching}
              newRow={newRow}
              newTagIds={newTagIds}
              page={cardsPage}
              pageSize={cardsPageSize}
              tableRef={tableRef}
              templates={templates}
              totalCount={totalCount}
              onAddCard={() => void addCard()}
              onDeleteCard={setCardToDelete}
              onFocusCell={focusCell}
              onNewRowChange={setNewRow}
              onNewTagIdsChange={setNewTagIds}
              onOpenCard={setSelectedCardId}
              onPageChange={setCardsPage}
              onUpdateCardSide={(card, template, content) =>
                void updateCardSide(card, template, content)
              }
            />
          </div>
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
      <DeckTagsModal
        deckId={deckId}
        isOpen={isDeckTagsOpen}
        tags={deck.tags}
        onClose={() => setIsDeckTagsOpen(false)}
      />
      <DeckSettingsModal
        deck={deck}
        isOpen={isDeckSettingsOpen}
        onClose={() => setIsDeckSettingsOpen(false)}
      />
      <DeckShareModal
        deckId={deckId}
        isOpen={isDeckShareOpen}
        reviewTypes={reviewTypes}
        templates={templates}
        onClose={() => setIsDeckShareOpen(false)}
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
