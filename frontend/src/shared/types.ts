export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  defaultReviewTypeId: string | null;
  requestRetention: number;
  updatedAt: string;
  stats: {
    totalCards: number;
    dueCards: number;
    lastReview: string | null;
  };
  reviewTypes: ReviewType[];
}

export interface SideTemplate {
  id: string;
  label: string;
  position: number;
}

export interface CardSide {
  id: string;
  label: string;
  content: string;
  position: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface CardRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastReviewEffective: string | null;
  sides: CardSide[];
  tags: Tag[];
}

export interface DeckDetail {
  id: string;
  name: string;
  description: string | null;
  defaultReviewTypeId: string | null;
  requestRetention: number;
  totalCards: number;
  sideTemplates: SideTemplate[];
  tags: Tag[];
}

export interface ReviewType {
  id: string;
  name: string;
  deckId: string;
  frontSidePosition: number;
  requestRetention: number;
  tagId: string | null;
  isDefault: boolean;
  dueCount: number;
  totalCards: number;
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

export interface ReviewCard {
  cardId: string;
  reviewTypeCardId: string | null;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  lastReview: string | null;
  learningStatus: string;
  recentRatings: number[];
  sides: CardSide[];
  tags: Tag[];
}

export interface ReviewTypeDetail {
  id: string;
  name: string;
  deckId: string;
  frontSidePosition: number;
  requestRetention: number;
  tagId: string | null;
  isDefault: boolean;
}

export interface CardReviewState {
  reviewTypeId: string;
  reviewTypeName: string;
  state: number;
  stability: number;
  difficulty: number;
  due: string;
  reps: number;
  lapses: number;
  lastReview: string | null;
  learningStatus: "new" | "learning" | "known";
}

export interface CardDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  sides: CardSide[];
  tags: Tag[];
  reviewCount: number;
  lastReview: string | null;
  recentRatings: Array<{ rating: number; reviewedAt: string }>;
  reviewStates: CardReviewState[];
}
