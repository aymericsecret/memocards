import { Container, Service } from "typedi";
import { Database } from "../database.js";
import { cardFromDb, cardToDb, Rating, reviewCard, State } from "../fsrs.js";

export interface SubmitReviewInput {
  cardId: string;
  rating: Rating;
  reviewTypeId: string;
}

interface ReviewTypeRow {
  request_retention: number;
}

interface ReviewTypeCardRow {
  id: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: Date;
  last_review: Date | null;
  recent_ratings: number[];
}

@Service()
export class ReviewsRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async submit(input: SubmitReviewInput) {
    const now = new Date();

    return this.database.transaction(async (client) => {
      const reviewTypeResult = await client.query<ReviewTypeRow>(
        `
        select request_retention
        from review_types
        where id = $1::uuid
        `,
        [input.reviewTypeId]
      );

      const reviewType = reviewTypeResult.rows[0];
      if (!reviewType) {
        throw new Error("Review type not found");
      }

      const stateResult = await client.query<ReviewTypeCardRow>(
        `
        select
          id,
          stability,
          difficulty,
          elapsed_days,
          scheduled_days,
          reps,
          lapses,
          state,
          due,
          last_review,
          recent_ratings::int[] as recent_ratings
        from review_type_cards
        where review_type_id = $1::uuid
          and card_id = $2::uuid
        for update
        `,
        [input.reviewTypeId, input.cardId]
      );

      const previous = stateResult.rows[0] ?? {
        id: null,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: State.New,
        due: now,
        last_review: null,
        recent_ratings: []
      };

      const result = reviewCard(
        cardFromDb({
          stability: previous.stability,
          difficulty: previous.difficulty,
          elapsedDays: previous.elapsed_days,
          scheduledDays: previous.scheduled_days,
          reps: previous.reps,
          lapses: previous.lapses,
          state: previous.state,
          due: previous.due,
          lastReview: previous.last_review
        }),
        input.rating,
        now,
        reviewType.request_retention
      );
      const updated = cardToDb(result.card);
      const recentRatings = [...previous.recent_ratings, input.rating].slice(-3);
      const hasRecentStruggle = recentRatings.some((rating) => rating === 1 || rating === 2);
      const learningStatus =
        updated.state === State.Review && !hasRecentStruggle ? "known" : "learning";

      const upsertResult = await client.query<{ id: string }>(
        `
        insert into review_type_cards (
          review_type_id,
          card_id,
          stability,
          difficulty,
          elapsed_days,
          scheduled_days,
          reps,
          lapses,
          state,
          due,
          last_review,
          learning_status,
          recent_ratings
        )
        values (
          $1::uuid,
          $2::uuid,
          $3::double precision,
          $4::double precision,
          $5::int,
          $6::int,
          $7::int,
          $8::int,
          $9::smallint,
          $10::timestamptz,
          $11::timestamptz,
          $12::learning_status,
          $13::smallint[]
        )
        on conflict (review_type_id, card_id)
        do update set
          stability = excluded.stability,
          difficulty = excluded.difficulty,
          elapsed_days = excluded.elapsed_days,
          scheduled_days = excluded.scheduled_days,
          reps = excluded.reps,
          lapses = excluded.lapses,
          state = excluded.state,
          due = excluded.due,
          last_review = excluded.last_review,
          learning_status = excluded.learning_status,
          recent_ratings = excluded.recent_ratings
        returning id
        `,
        [
          input.reviewTypeId,
          input.cardId,
          updated.stability,
          updated.difficulty,
          updated.elapsedDays,
          updated.scheduledDays,
          updated.reps,
          updated.lapses,
          updated.state,
          updated.due,
          updated.lastReview,
          learningStatus,
          recentRatings
        ]
      );

      const reviewTypeCardId = upsertResult.rows[0].id;

      await client.query(
        `
        insert into review_logs (
          review_type_id,
          review_type_card_id,
          card_id,
          rating,
          previous_state,
          previous_due,
          next_state,
          next_due,
          stability,
          difficulty,
          elapsed_days,
          scheduled_days,
          reviewed_at
        )
        values (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::smallint,
          $5::smallint,
          $6::timestamptz,
          $7::smallint,
          $8::timestamptz,
          $9::double precision,
          $10::double precision,
          $11::int,
          $12::int,
          $13::timestamptz
        )
        `,
        [
          input.reviewTypeId,
          reviewTypeCardId,
          input.cardId,
          input.rating,
          previous.state,
          previous.due,
          updated.state,
          updated.due,
          updated.stability,
          updated.difficulty,
          updated.elapsedDays,
          updated.scheduledDays,
          now
        ]
      );

      return {
        reviewTypeCardId,
        cardId: input.cardId,
        stability: updated.stability,
        difficulty: updated.difficulty,
        elapsedDays: updated.elapsedDays,
        scheduledDays: updated.scheduledDays,
        reps: updated.reps,
        lapses: updated.lapses,
        state: updated.state,
        due: updated.due,
        lastReview: updated.lastReview,
        learningStatus,
        recentRatings
      };
    });
  }
}
