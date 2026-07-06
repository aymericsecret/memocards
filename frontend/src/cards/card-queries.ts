import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { api } from "../shared/api";
import { deckKeys } from "../deck/deck-queries";
import type { CardDetail, CardRow, SideTemplate, Tag } from "../shared/types";

export interface CardsQueryFilters {
  page: number;
  pageSize: number;
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
  detail: (cardId: string | null) => ["cardDetail", cardId] as const,
  list: (deckId: string, filters: CardsQueryFilters) =>
    ["deckCards", deckId, filters] as const
};

export function useDeckCardsQuery(deckId: string, filters: CardsQueryFilters) {
  return useQuery({
    queryKey: cardKeys.list(deckId, filters),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const query = new URLSearchParams({
        page: String(filters.page),
        pageSize: String(filters.pageSize),
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
    mutationFn: (input: {
      sides: Array<{ content: string; label: string; position: number }>;
      tagIds?: string[];
    }) =>
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
      void queryClient.invalidateQueries({ queryKey: ["reviewTypeDueCards"] });
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

export function useCardDetailQuery(cardId: string | null) {
  return useQuery({
    enabled: Boolean(cardId),
    queryKey: cardKeys.detail(cardId),
    queryFn: async () => {
      const data = await api<{ card: CardDetail }>(`/cards/${cardId}/detail`);
      return data.card;
    }
  });
}

export function useCreateTagMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      api<Tag>(`/decks/${deckId}/tags`, {
        method: "POST",
        body: JSON.stringify({ name })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
    }
  });
}

export function useUpdateTagMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { tagId: string; name: string }) =>
      api<Tag>(`/tags/${input.tagId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: input.name })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypes", deckId] });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypeDueCards"] });
    }
  });
}

export function useDeleteTagMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) =>
      api<{ id: string }>(`/tags/${tagId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypes", deckId] });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypeDueCards"] });
    }
  });
}

export function useAddCardTagMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { cardId: string; tagId: string }) =>
      api<{ cardId: string; tagId: string }>(`/cards/${input.cardId}/tags/${input.tagId}`, {
        method: "PUT"
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: cardKeys.detail(input.cardId) });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypeDueCards"] });
    }
  });
}

export function useRemoveCardTagMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { cardId: string; tagId: string }) =>
      api<{ cardId: string; tagId: string }>(`/cards/${input.cardId}/tags/${input.tagId}`, {
        method: "DELETE"
      }),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ["deckCards", deckId] });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: cardKeys.detail(input.cardId) });
      void queryClient.invalidateQueries({ queryKey: ["reviewTypeDueCards"] });
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
