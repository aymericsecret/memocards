export interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  defaultReviewTypeId: string | null;
  updatedAt: string;
  stats: {
    totalCards: number;
    dueCards: number;
    lastReview: string | null;
  };
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
  totalCards: number;
  sideTemplates: SideTemplate[];
  tags: Tag[];
}
