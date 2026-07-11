import { Container, Service } from "typedi";
import { Database } from "../database.js";
import type { ReviewGroupKey } from "./deck-cards.repository.js";

export interface GetDueReviewCardsParams {
  reviewTypeId: string;
  excludeCardIds?: string[] | null;
  groups?: ReviewGroupKey[] | null;
  limit: number;
  offset: number;
  snapshotAt: string;
}

interface DueReviewCardRow {
  card_id: string;
  review_type_card_id: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  due: string;
  last_review: string | null;
  learning_status: string;
  recent_ratings: number[];
  total_count: string;
  sides: unknown;
  tags: unknown;
}

@Service()
export class ReviewQueueRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async getDueReviewCards(params: GetDueReviewCardsParams) {
    const result = await this.database.query<DueReviewCardRow>(
      `
      with review_type as (
        select id, deck_id, tag_id, front_side_position, back_side_position
        from review_types
        where id = $1::uuid
      ),
      eligible as (
        select
          c.id as card_id,
          rtc.id as review_type_card_id,
          coalesce(rtc.stability, 0)::double precision as stability,
          coalesce(rtc.difficulty, 0)::double precision as difficulty,
          coalesce(rtc.elapsed_days, 0)::int as elapsed_days,
          coalesce(rtc.scheduled_days, 0)::int as scheduled_days,
          coalesce(rtc.reps, 0)::int as reps,
          coalesce(rtc.lapses, 0)::int as lapses,
          coalesce(rtc.state, 0)::int as state,
          coalesce(rtc.due, $5::timestamptz) as due,
          rtc.last_review,
          coalesce(rtc.learning_status, 'new'::learning_status)::text as learning_status,
          coalesce(rtc.recent_ratings, '{}'::smallint[])::smallint[] as recent_ratings,
          case
            when rtc.id is null then 'new'
            when rtc.due <= $5::timestamptz then 'now'
            when rtc.due <= $5::timestamptz + interval '1 hour' then 'in1h'
            when rtc.due <= $5::timestamptz + interval '24 hours' then 'in24h'
            when rtc.due <= $5::timestamptz + interval '48 hours' then 'tomorrow'
            when rtc.due <= $5::timestamptz + interval '7 days' then 'inWeek'
            else 'later'
          end as review_group
        from review_type rt
        join cards c on c.deck_id = rt.deck_id
        left join review_type_cards rtc
          on rtc.review_type_id = rt.id
         and rtc.card_id = c.id
        where (
            rt.tag_id is null
            or exists (
              select 1
              from card_tags ct
              where ct.card_id = c.id
                and ct.tag_id = rt.tag_id
            )
          )
          and exists (
            select 1
            from card_sides front_side
            where front_side.card_id = c.id
              and front_side.position = rt.front_side_position
              and btrim(front_side.content) <> ''
          )
          and (
            rt.back_side_position is null
            or exists (
              select 1
              from card_sides back_side
              where back_side.card_id = c.id
                and back_side.position = rt.back_side_position
                and btrim(back_side.content) <> ''
            )
          )
          and ($6::uuid[] is null or c.id <> all($6::uuid[]))
      ),
      filtered as (
        select *
        from eligible
        where (
          ($2::text[] is null and (review_type_card_id is null or due <= $5::timestamptz))
          or ($2::text[] is not null and review_group = any($2::text[]))
        )
      ),
      counted as (
        select *, count(*) over() as total_count
        from filtered
      )
      select
        c.card_id,
        c.review_type_card_id,
        c.stability,
        c.difficulty,
        c.elapsed_days,
        c.scheduled_days,
        c.reps,
        c.lapses,
        c.state,
        c.due,
        c.last_review,
        c.learning_status,
        c.recent_ratings,
        c.total_count,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', cs.id,
                'label', cs.label,
                'content', cs.content,
                'position', cs.position
              )
              order by cs.position
            )
            from card_sides cs
            where cs.card_id = c.card_id
          ),
          '[]'::jsonb
        ) as sides,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object('id', t.id, 'name', t.name)
              order by t.name
            )
            from card_tags ct
            join tags t on t.id = ct.tag_id
            where ct.card_id = c.card_id
          ),
          '[]'::jsonb
        ) as tags
      from counted c
      order by (c.review_type_card_id is null) desc, c.due asc, c.card_id asc
      limit $3::int offset $4::int
      `,
      [
        params.reviewTypeId,
        params.groups?.length ? params.groups : null,
        params.limit,
        params.offset,
        params.snapshotAt,
        params.excludeCardIds?.length ? params.excludeCardIds : null
      ]
    );

    return {
      cards: result.rows.map((row) => ({
        cardId: row.card_id,
        reviewTypeCardId: row.review_type_card_id,
        stability: row.stability,
        difficulty: row.difficulty,
        elapsedDays: row.elapsed_days,
        scheduledDays: row.scheduled_days,
        reps: row.reps,
        lapses: row.lapses,
        state: row.state,
        due: row.due,
        lastReview: row.last_review,
        learningStatus: row.learning_status,
        recentRatings: row.recent_ratings,
        sides: row.sides,
        tags: row.tags
      })),
      totalCount: Number(result.rows[0]?.total_count ?? 0)
    };
  }
}
