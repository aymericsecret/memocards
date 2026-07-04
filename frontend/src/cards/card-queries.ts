import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api";
import { deckKeys } from "../deck/deck-queries";
import type { CardRow, SideTemplate } from "../shared/types";

export interface CardsQueryFilters {
  search: string;
  selectedStatuses: string[];
  selectedTagIds: string[];
  sideEmpty: number[];
  sideFilled: number[];
  sortDir: "asc" | "desc";
  sortField: "created_at" | "last_review";
  reviewTypeId: string | null;
}

export const cardKeys = {
  list: (deckId: string, filters: CardsQueryFilters) =>
    ["deckCards", deckId, filters] as const
};

export function useDeckCardsQuery(deckId: string, filters: CardsQueryFilters) {
  return useQuery({
    queryKey: cardKeys.list(deckId, filters),
    queryFn: async () => {
      const query = new URLSearchParams({
        pageSize: "100",
        sortField: filters.sortField,
        sortDir: filters.sortDir
      });

      if (filters.search.trim()) query.set("search", filters.search.trim());
      if (filters.selectedTagIds.length) {
        query.set("tagIds", filters.selectedTagIds.join(","));
      }
      if (filters.selectedStatuses.length) {
        query.set("statuses", filters.selectedStatuses.join(","));
        if (filters.reviewTypeId) query.set("reviewTypeId", filters.reviewTypeId);
      }
      if (filters.sideFilled.length) query.set("sideFilled", filters.sideFilled.join(","));
      if (filters.sideEmpty.length) query.set("sideEmpty", filters.sideEmpty.join(","));

      return api<{ cards: CardRow[]; totalCount: number }>(
        `/decks/${deckId}/cards?${query.toString()}`
      );
    }
  });
}

export function useCreateCardMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { sides: Array<{ content: string; label: string; position: number }> }) =>
      api<{ id: string }>(`/decks/${deckId}/cards`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
    }
  });
}

export function useUpdateCardMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      cardId: string;
      sides: Array<{ content: string; label: string; position: number }>;
    }) =>
      api<{ id: string }>(`/cards/${input.cardId}`, {
        method: "PATCH",
        body: JSON.stringify({ sides: input.sides })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
    }
  });
}

export function useDeleteCardMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) =>
      api<{ id: string }>(`/cards/${cardId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
    }
  });
}

export function createCardSidesPayload(
  templates: SideTemplate[],
  values: Record<number, string>
) {
  return templates.map((template) => ({
    position: template.position,
    label: template.label,
    content: values[template.position] ?? ""
  }));
}
