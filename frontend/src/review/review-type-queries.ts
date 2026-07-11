import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deckKeys } from "../deck/deck-queries";
import { api } from "../shared/api";
import type { ReviewCard, ReviewType, ReviewTypeDetail } from "../shared/types";

export interface CreateReviewTypeInput {
  frontSidePosition: number;
  name: string;
  tagId?: string | null;
}

export interface UpdateReviewTypeInput {
  name?: string;
  requestRetention?: number;
  tagId?: string | null;
}

export const reviewTypeKeys = {
  detail: (reviewTypeId: string) => ["reviewType", reviewTypeId] as const,
  dueCards: (
    reviewTypeId: string,
    groups: string | null,
    snapshotAt: string,
    excludeCardIds: string
  ) => ["reviewTypeDueCards", reviewTypeId, groups, snapshotAt, excludeCardIds] as const,
  list: (deckId: string) => ["reviewTypes", deckId] as const
};

export function useReviewTypesQuery(deckId: string) {
  return useQuery({
    queryKey: reviewTypeKeys.list(deckId),
    queryFn: async () => {
      const data = await api<{ reviewTypes: ReviewType[] }>(`/decks/${deckId}/review-types`);
      return data.reviewTypes;
    }
  });
}

export function useReviewTypeQuery(reviewTypeId: string) {
  return useQuery({
    queryKey: reviewTypeKeys.detail(reviewTypeId),
    queryFn: async () => {
      const data = await api<{ reviewType: ReviewTypeDetail }>(
        `/review-types/${reviewTypeId}`
      );
      return data.reviewType;
    }
  });
}

export function useDueReviewCardsQuery(
  reviewTypeId: string,
  groups: string | null,
  snapshotAt: string,
  excludeCardIds: string[]
) {
  const excludeCardIdsKey = excludeCardIds.join(",");

  return useQuery({
    queryKey: reviewTypeKeys.dueCards(reviewTypeId, groups, snapshotAt, excludeCardIdsKey),
    queryFn: async () => {
      const query = new URLSearchParams({
        page: "0",
        pageSize: "100",
        snapshotAt
      });
      if (groups) query.set("groups", groups);
      if (excludeCardIdsKey) query.set("excludeCardIds", excludeCardIdsKey);

      return api<{ cards: ReviewCard[]; totalCount: number }>(
        `/review-types/${reviewTypeId}/due-cards?${query.toString()}`
      );
    },
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });
}

export function useCreateReviewTypeMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewTypeInput) =>
      api<{ id: string }>(`/decks/${deckId}/review-types`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
    }
  });
}

export function useUpdateReviewTypeMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { reviewTypeId: string; values: UpdateReviewTypeInput }) =>
      api<{ id: string }>(`/review-types/${input.reviewTypeId}`, {
        method: "PATCH",
        body: JSON.stringify(input.values)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
    }
  });
}

export function useDeleteReviewTypeMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewTypeId: string) =>
      api<{ id: string }>(`/review-types/${reviewTypeId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    }
  });
}

export function useSetDefaultReviewTypeMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewTypeId: string) =>
      api<{ id: string }>(`/decks/${deckId}/default-review-type/${reviewTypeId}`, {
        method: "PUT"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
    }
  });
}

export function useResetReviewTypeProgressMutation(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewTypeId: string) =>
      api<{ id: string }>(`/review-types/${reviewTypeId}/reset-progress`, {
        method: "POST"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
    }
  });
}

export function useSubmitReviewMutation(reviewTypeId: string, deckId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { cardId: string; rating: 1 | 2 | 3 | 4 }) =>
      api<ReviewCard>(`/review-types/${reviewTypeId}/reviews`, {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: () => {
      if (deckId) {
        void queryClient.invalidateQueries({ queryKey: reviewTypeKeys.list(deckId) });
        void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
        void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      }
    }
  });
}
