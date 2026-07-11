import { Container, Service } from "typedi";
import { Database } from "../database.js";

interface ReviewTypeRow {
  id: string;
  name: string;
  deck_id: string;
  front_side_position: number;
  back_side_position: number | null;
  request_retention: number;
  tag_id: string | null;
  created_at: string;
  is_default: boolean;
  total_cards: string;
  due_count: string;
  new_count: string;
  now_count: string;
  in1h_count: string;
  in24h_count: string;
  tomorrow_count: string;
  in_week_count: string;
  later_count: string;
}

interface ReviewTypeDetailRow {
  id: string;
  name: string;
  deck_id: string;
  front_side_position: number;
  back_side_position: number | null;
  request_retention: number;
  tag_id: string | null;
  is_default: boolean;
}

export interface CreateReviewTypeInput {
  backSidePosition?: number | null;
  deckId: string;
  frontSidePosition: number;
  name: string;
  tagId?: string | null;
}

export interface UpdateReviewTypeInput {
  backSidePosition?: number | null;
  name?: string;
  requestRetention?: number;
  tagId?: string | null;
}

@Service()
export class ReviewTypesRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async listByDeck(deckId: string) {
    const result = await this.database.query<ReviewTypeRow>(
      `
      with review_types_with_cards as (
        select
          rt.*,
          d.default_review_type_id = rt.id as is_default,
          c.id as card_id,
          rtc.id as rtc_id,
          rtc.due,
          case
            when rtc.id is null then 'new'
            when rtc.due <= now() then 'now'
            when rtc.due <= now() + interval '1 hour' then 'in1h'
            when rtc.due <= now() + interval '24 hours' then 'in24h'
            when rtc.due <= now() + interval '48 hours' then 'tomorrow'
            when rtc.due <= now() + interval '7 days' then 'inWeek'
            else 'later'
          end as review_group
        from review_types rt
        join decks d on d.id = rt.deck_id
        left join cards c
          on c.deck_id = rt.deck_id
         and (
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
        left join review_type_cards rtc
          on rtc.review_type_id = rt.id
         and rtc.card_id = c.id
        where rt.deck_id = $1::uuid
      )
      select
        id,
        name,
        deck_id,
        front_side_position,
        back_side_position,
        request_retention,
        tag_id,
        created_at,
        is_default,
        count(card_id) as total_cards,
        count(card_id) filter (where rtc_id is null or due <= now()) as due_count,
        count(card_id) filter (where review_group = 'new') as new_count,
        count(card_id) filter (where review_group = 'now') as now_count,
        count(card_id) filter (where review_group = 'in1h') as in1h_count,
        count(card_id) filter (where review_group = 'in24h') as in24h_count,
        count(card_id) filter (where review_group = 'tomorrow') as tomorrow_count,
        count(card_id) filter (where review_group = 'inWeek') as in_week_count,
        count(card_id) filter (where review_group = 'later') as later_count
      from review_types_with_cards
      group by
        id,
        name,
        deck_id,
        front_side_position,
        back_side_position,
        request_retention,
        tag_id,
        created_at,
        is_default
      order by created_at asc
      `,
      [deckId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      deckId: row.deck_id,
      frontSidePosition: row.front_side_position,
      backSidePosition: row.back_side_position,
      requestRetention: row.request_retention,
      tagId: row.tag_id,
      isDefault: row.is_default,
      dueCount: Number(row.due_count),
      totalCards: Number(row.total_cards),
      groups: {
        new: Number(row.new_count),
        now: Number(row.now_count),
        in1h: Number(row.in1h_count),
        in24h: Number(row.in24h_count),
        tomorrow: Number(row.tomorrow_count),
        inWeek: Number(row.in_week_count),
        later: Number(row.later_count)
      }
    }));
  }

  async getById(reviewTypeId: string) {
    const result = await this.database.query<ReviewTypeDetailRow>(
      `
      select
        rt.id,
        rt.name,
        rt.deck_id,
        rt.front_side_position,
        rt.back_side_position,
        rt.request_retention,
        rt.tag_id,
        d.default_review_type_id = rt.id as is_default
      from review_types rt
      join decks d on d.id = rt.deck_id
      where rt.id = $1::uuid
      `,
      [reviewTypeId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      deckId: row.deck_id,
      frontSidePosition: row.front_side_position,
      backSidePosition: row.back_side_position,
      requestRetention: row.request_retention,
      tagId: row.tag_id,
      isDefault: row.is_default
    };
  }

  async create(input: CreateReviewTypeInput) {
    const result = await this.database.query<{ id: string }>(
      `
      insert into review_types (deck_id, name, front_side_position, back_side_position, tag_id)
      values ($1::uuid, $2::text, $3::int, $4::int, $5::uuid)
      returning id
      `,
      [
        input.deckId,
        input.name.trim(),
        input.frontSidePosition,
        input.backSidePosition ?? null,
        input.tagId ?? null
      ]
    );

    return { id: result.rows[0].id };
  }

  async update(reviewTypeId: string, input: UpdateReviewTypeInput) {
    await this.database.query(
      `
      update review_types
      set
        name = coalesce($2::text, name),
        request_retention = coalesce($3::double precision, request_retention),
        tag_id = case when $5::boolean then $4::uuid else tag_id end,
        back_side_position = case when $7::boolean then $6::int else back_side_position end
      where id = $1::uuid
      `,
      [
        reviewTypeId,
        input.name?.trim() || null,
        input.requestRetention ?? null,
        input.tagId ?? null,
        Object.hasOwn(input, "tagId"),
        input.backSidePosition ?? null,
        Object.hasOwn(input, "backSidePosition")
      ]
    );

    return { id: reviewTypeId };
  }

  async delete(reviewTypeId: string) {
    await this.database.query(
      `
      delete from review_types
      where id = $1::uuid
      `,
      [reviewTypeId]
    );

    return { id: reviewTypeId };
  }

  async setDefault(deckId: string, reviewTypeId: string) {
    await this.database.query(
      `
      update decks
      set default_review_type_id = $2::uuid
      where id = $1::uuid
      `,
      [deckId, reviewTypeId]
    );

    return { id: reviewTypeId };
  }

  async resetProgress(reviewTypeId: string) {
    await this.database.transaction(async (client) => {
      await client.query(
        `
        delete from review_logs
        where review_type_id = $1::uuid
        `,
        [reviewTypeId]
      );
      await client.query(
        `
        delete from review_type_cards
        where review_type_id = $1::uuid
        `,
        [reviewTypeId]
      );
    });

    return { id: reviewTypeId };
  }
}
