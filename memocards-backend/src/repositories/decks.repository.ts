import { Container, Service } from "typedi";
import { Database } from "../database.js";

export interface CreateDeckInput {
  userId: string;
  name: string;
  description?: string | null;
  sideLabels: string[];
}

interface DeckRow {
  id: string;
  name: string;
  description: string | null;
  request_retention: number;
  default_review_type_id: string | null;
  created_at: string;
  updated_at: string;
  total_cards: string;
  due_cards: string;
  last_review: string | null;
  review_types: unknown;
}

interface DeckDetailRow {
  id: string;
  name: string;
  description: string | null;
  request_retention: number;
  default_review_type_id: string | null;
  created_at: string;
  updated_at: string;
  total_cards: string;
  side_templates: unknown;
  tags: unknown;
}

interface DeckStatsReviewTypeRow {
  id: string;
  name: string;
}

interface DeckReviewStatsRow {
  review_type_id: string;
  total_cards: string;
  total_reviews: string;
  last_review_date: string | null;
  new_count: string;
  learning_count: string;
  known_count: string;
  group_new: string;
  group_now: string;
  group_in1h: string;
  group_in24h: string;
  group_tomorrow: string;
  group_in_week: string;
  group_later: string;
}

interface DeckReviewHistoryRow {
  review_type_id: string;
  day: string;
  again: string;
  hard: string;
  good: string;
  easy: string;
}

@Service()
export class DecksRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async ensureUser(userId: string) {
    await this.database.query(
      `
      insert into users (id, email, display_name)
      values ($1::uuid, 'local@memocards.dev', 'Local user')
      on conflict (id) do nothing
      `,
      [userId]
    );
  }

  async listDecks(userId: string) {
    await this.ensureUser(userId);

    const result = await this.database.query<DeckRow>(
      `
      with review_type_cards_scoped as (
        select
          rt.id as review_type_id,
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
        join cards c
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
        left join review_type_cards rtc
          on rtc.review_type_id = rt.id
         and rtc.card_id = c.id
      ),
      review_types_with_counts as (
        select
          rt.id,
          rt.deck_id,
          rt.name,
          rt.front_side_position,
          rt.request_retention,
          rt.tag_id,
          rt.created_at,
          count(scoped.card_id) as total_cards,
          count(scoped.card_id) filter (
            where scoped.rtc_id is null or scoped.due <= now()
          ) as due_count,
          count(scoped.card_id) filter (where scoped.review_group = 'new') as new_count,
          count(scoped.card_id) filter (where scoped.review_group = 'now') as now_count,
          count(scoped.card_id) filter (where scoped.review_group = 'in1h') as in1h_count,
          count(scoped.card_id) filter (where scoped.review_group = 'in24h') as in24h_count,
          count(scoped.card_id) filter (where scoped.review_group = 'tomorrow') as tomorrow_count,
          count(scoped.card_id) filter (where scoped.review_group = 'inWeek') as in_week_count,
          count(scoped.card_id) filter (where scoped.review_group = 'later') as later_count
        from review_types rt
        left join review_type_cards_scoped scoped on scoped.review_type_id = rt.id
        group by rt.id
      )
      select
        d.id,
        d.name,
        d.description,
        d.request_retention,
        d.default_review_type_id,
        d.created_at,
        d.updated_at,
        count(distinct c.id) as total_cards,
        count(distinct c.id) filter (
          where d.default_review_type_id is not null
            and (rtc.id is null or rtc.due <= now())
        ) as due_cards,
        max(rtc.last_review) as last_review,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', rtc_counts.id,
                'name', rtc_counts.name,
                'deckId', rtc_counts.deck_id,
                'frontSidePosition', rtc_counts.front_side_position,
                'requestRetention', rtc_counts.request_retention,
                'tagId', rtc_counts.tag_id,
                'isDefault', d.default_review_type_id = rtc_counts.id,
                'dueCount', rtc_counts.due_count,
                'totalCards', rtc_counts.total_cards,
                'groups', jsonb_build_object(
                  'new', rtc_counts.new_count,
                  'now', rtc_counts.now_count,
                  'in1h', rtc_counts.in1h_count,
                  'in24h', rtc_counts.in24h_count,
                  'tomorrow', rtc_counts.tomorrow_count,
                  'inWeek', rtc_counts.in_week_count,
                  'later', rtc_counts.later_count
                )
              )
              order by rtc_counts.created_at
            )
            from review_types_with_counts rtc_counts
            where rtc_counts.deck_id = d.id
          ),
          '[]'::jsonb
        ) as review_types
      from decks d
      left join cards c on c.deck_id = d.id
      left join review_type_cards rtc
        on rtc.card_id = c.id
       and rtc.review_type_id = d.default_review_type_id
      where d.user_id = $1::uuid
      group by d.id
      order by greatest(d.updated_at, coalesce(max(rtc.last_review), d.updated_at)) desc
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      requestRetention: row.request_retention,
      defaultReviewTypeId: row.default_review_type_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stats: {
        totalCards: Number(row.total_cards),
        dueCards: Number(row.due_cards),
        lastReview: row.last_review
      },
      reviewTypes: row.review_types
    }));
  }

  async getDeck(deckId: string, userId: string) {
    await this.ensureUser(userId);

    const result = await this.database.query<DeckDetailRow>(
      `
      select
        d.id,
        d.name,
        d.description,
        d.request_retention,
        d.default_review_type_id,
        d.created_at,
        d.updated_at,
        count(distinct c.id) as total_cards,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', dst.id,
                'label', dst.label,
                'position', dst.position
              )
              order by dst.position
            )
            from deck_side_templates dst
            where dst.deck_id = d.id
          ),
          '[]'::jsonb
        ) as side_templates
        ,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', t.id,
                'name', t.name
              )
              order by t.name
            )
            from tags t
            where t.deck_id = d.id
          ),
          '[]'::jsonb
        ) as tags
      from decks d
      left join cards c on c.deck_id = d.id
      where d.id = $1::uuid and d.user_id = $2::uuid
      group by d.id
      `,
      [deckId, userId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      requestRetention: row.request_retention,
      defaultReviewTypeId: row.default_review_type_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalCards: Number(row.total_cards),
      sideTemplates: row.side_templates,
      tags: row.tags
    };
  }

  async getDeckStats(deckId: string, userId: string) {
    await this.ensureUser(userId);

    const deckResult = await this.database.query<{ id: string }>(
      `
      select id
      from decks
      where id = $1::uuid
        and user_id = $2::uuid
      `,
      [deckId, userId]
    );

    if (!deckResult.rows[0]) return null;

    const [reviewTypesResult, statsResult, historyResult] = await Promise.all([
      this.database.query<DeckStatsReviewTypeRow>(
        `
        select id, name
        from review_types
        where deck_id = $1::uuid
        order by created_at asc
        `,
        [deckId]
      ),
      this.database.query<DeckReviewStatsRow>(
        `
        with scoped as (
          select
            rt.id as review_type_id,
            c.id as card_id,
            rtc.id as rtc_id,
            coalesce(rtc.learning_status, 'new'::learning_status)::text as learning_status,
            rtc.last_review,
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
          join cards c
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
          left join review_type_cards rtc
            on rtc.review_type_id = rt.id
           and rtc.card_id = c.id
          where rt.deck_id = $1::uuid
        ),
        reviews as (
          select review_type_id, count(*) as total_reviews
          from review_logs
          where review_type_id in (
            select id
            from review_types
            where deck_id = $1::uuid
          )
          group by review_type_id
        )
        select
          scoped.review_type_id,
          count(scoped.card_id) as total_cards,
          coalesce(max(reviews.total_reviews), 0) as total_reviews,
          max(scoped.last_review) as last_review_date,
          count(scoped.card_id) filter (where scoped.rtc_id is null) as new_count,
          count(scoped.card_id) filter (where scoped.rtc_id is not null and scoped.learning_status = 'learning') as learning_count,
          count(scoped.card_id) filter (where scoped.learning_status = 'known') as known_count,
          count(scoped.card_id) filter (where scoped.review_group = 'new') as group_new,
          count(scoped.card_id) filter (where scoped.review_group = 'now') as group_now,
          count(scoped.card_id) filter (where scoped.review_group = 'in1h') as group_in1h,
          count(scoped.card_id) filter (where scoped.review_group = 'in24h') as group_in24h,
          count(scoped.card_id) filter (where scoped.review_group = 'tomorrow') as group_tomorrow,
          count(scoped.card_id) filter (where scoped.review_group = 'inWeek') as group_in_week,
          count(scoped.card_id) filter (where scoped.review_group = 'later') as group_later
        from scoped
        left join reviews on reviews.review_type_id = scoped.review_type_id
        group by scoped.review_type_id
        `,
        [deckId]
      ),
      this.database.query<DeckReviewHistoryRow>(
        `
        select
          rl.review_type_id,
          to_char(date_trunc('day', rl.reviewed_at), 'YYYY-MM-DD') as day,
          count(*) filter (where rl.rating = 1) as again,
          count(*) filter (where rl.rating = 2) as hard,
          count(*) filter (where rl.rating = 3) as good,
          count(*) filter (where rl.rating = 4) as easy
        from review_logs rl
        join review_types rt on rt.id = rl.review_type_id
        where rt.deck_id = $1::uuid
        group by rl.review_type_id, date_trunc('day', rl.reviewed_at)
        order by day asc
        `,
        [deckId]
      )
    ]);

    const statsByReviewType = Object.fromEntries(
      statsResult.rows.map((row) => [
        row.review_type_id,
        {
          totalCards: Number(row.total_cards),
          totalReviews: Number(row.total_reviews),
          lastReviewDate: row.last_review_date,
          newCount: Number(row.new_count),
          learningCount: Number(row.learning_count),
          knownCount: Number(row.known_count),
          groups: {
            new: Number(row.group_new),
            now: Number(row.group_now),
            in1h: Number(row.group_in1h),
            in24h: Number(row.group_in24h),
            tomorrow: Number(row.group_tomorrow),
            inWeek: Number(row.group_in_week),
            later: Number(row.group_later)
          }
        }
      ])
    );

    const historyByReviewType: Record<string, unknown[]> = {};
    for (const row of historyResult.rows) {
      historyByReviewType[row.review_type_id] ??= [];
      historyByReviewType[row.review_type_id].push({
        date: row.day,
        again: Number(row.again),
        hard: Number(row.hard),
        good: Number(row.good),
        easy: Number(row.easy)
      });
    }

    return {
      reviewTypes: reviewTypesResult.rows.map((row) => ({
        id: row.id,
        name: row.name
      })),
      statsByReviewType,
      historyByReviewType
    };
  }

  async createDeck(input: CreateDeckInput) {
    await this.ensureUser(input.userId);

    const deckId = await this.database.transaction(async (client) => {
      const deckResult = await client.query<{ id: string }>(
        `
        insert into decks (user_id, name, description)
        values ($1::uuid, $2::text, $3::text)
        returning id
        `,
        [input.userId, input.name.trim(), input.description?.trim() || null]
      );
      const createdDeckId = deckResult.rows[0].id;
      const sideLabels = input.sideLabels
        .map((label) => label.trim())
        .filter(Boolean);

      for (const [position, label] of sideLabels.entries()) {
        await client.query(
          `
          insert into deck_side_templates (deck_id, label, position)
          values ($1::uuid, $2::text, $3::int)
          `,
          [createdDeckId, label, position]
        );
      }

      const reviewTypeResult = await client.query<{ id: string }>(
        `
        insert into review_types (deck_id, name, front_side_position)
        values ($1::uuid, $2::text, 0)
        returning id
        `,
        [createdDeckId, sideLabels[0] ?? "Recto"]
      );

      await client.query(
        `
        update decks
        set default_review_type_id = $2::uuid
        where id = $1::uuid
        `,
        [createdDeckId, reviewTypeResult.rows[0].id]
      );

      return createdDeckId;
    });

    return this.getDeck(deckId, input.userId);
  }

  async deleteDeck(deckId: string, userId: string) {
    const result = await this.database.query<{ id: string }>(
      `
      delete from decks
      where id = $1::uuid
        and user_id = $2::uuid
      returning id
      `,
      [deckId, userId]
    );

    return { id: result.rows[0]?.id ?? null };
  }
}
