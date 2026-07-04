import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api";
import { navigate } from "../shared/navigation";
import type { DeckDetail, DeckSummary } from "../shared/types";

export interface CreateDeckInput {
  description: string;
  name: string;
  sideLabels: string[];
}

export const deckKeys = {
  all: ["decks"] as const,
  detail: (deckId: string | null) => ["deck", deckId] as const
};

export function useDecksQuery() {
  return useQuery({
    queryKey: deckKeys.all,
    queryFn: async () => {
      const data = await api<{ decks: DeckSummary[] }>("/decks");
      return data.decks;
    }
  });
}

export function useDeckQuery(deckId: string | null) {
  return useQuery({
    enabled: Boolean(deckId),
    queryKey: deckKeys.detail(deckId),
    queryFn: async () => {
      const data = await api<{ deck: DeckDetail }>(`/decks/${deckId}`);
      return data.deck;
    }
  });
}

export function useCreateDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeckInput) =>
      api<DeckDetail>("/decks", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    onSuccess: (deck) => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      queryClient.setQueryData(deckKeys.detail(deck.id), deck);
      navigate(`/deck/${deck.id}`);
    }
  });
}

export function useDeleteDeckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) =>
      api<{ id: string }>(`/decks/${deckId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      navigate("/");
    }
  });
}
