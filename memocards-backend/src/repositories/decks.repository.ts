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
        max(rtc.last_review) as last_review
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
      }
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
}
