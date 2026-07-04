import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api";

export interface DeckReviewStats {
  totalCards: number;
  totalReviews: number;
  lastReviewDate: string | null;
  newCount: number;
  learningCount: number;
  knownCount: number;
  groups: {
    new: number;
    now: number;
    in1h: number;
    in24h: number;
    tomorrow: number;
    inWeek: number;
    later: number;
  };
}

export interface DeckReviewHistoryPoint {
  again: number;
  date: string;
  easy: number;
  good: number;
  hard: number;
}

export interface DeckStatsData {
  reviewTypes: Array<{ id: string; name: string }>;
  statsByReviewType: Record<string, DeckReviewStats>;
  historyByReviewType: Record<string, DeckReviewHistoryPoint[]>;
}

export function useDeckStatsQuery(deckId: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["deckStats", deckId],
    queryFn: () => api<DeckStatsData>(`/decks/${deckId}/stats`)
  });
}
