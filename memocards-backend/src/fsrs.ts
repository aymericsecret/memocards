import {
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade
} from "ts-fsrs";

export { Rating, State };

export interface DbFsrsCard {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  due: string | Date;
  lastReview: string | Date | null;
}

export function cardFromDb(row: DbFsrsCard): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined
  };
}

export function reviewCard(
  card: Card,
  rating: Rating,
  now: Date,
  requestRetention: number
) {
  const scheduler = fsrs(
    generatorParameters({
      enable_fuzz: true,
      request_retention: requestRetention
    })
  );

  return scheduler.repeat(card, now)[rating as Grade];
}

export function cardToDb(card: Card) {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    due: card.due.toISOString(),
    lastReview: card.last_review ? card.last_review.toISOString() : null
  };
}
