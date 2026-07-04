import { Container, Service } from "typedi";
import { Database } from "../database.js";
import { DecksRepository } from "./decks.repository.js";

export interface CardSideInput {
  position: number;
  label?: string;
  content: string;
}

export interface CreateCardInput {
  userId: string;
  deckId: string;
  sides: CardSideInput[];
  tagIds?: string[];
}

export interface UpdateCardInput {
  cardId: string;
  sides: CardSideInput[];
}

interface CardDetailRow {
  id: string;
  created_at: string;
  updated_at: string;
  sides: unknown;
  tags: unknown;
  review_count: string;
  last_review: string | null;
  recent_ratings: unknown;
  review_states: unknown;
}

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

@Service()
export class CardsRepository {
  private readonly database: Database;
  private readonly decksRepository: DecksRepository;

  constructor() {
    this.database = Container.get(Database);
    this.decksRepository = Container.get(DecksRepository);
  }

  async createCard(input: CreateCardInput) {
    await this.decksRepository.ensureUser(input.userId);

    return this.database.transaction(async (client) => {
      const deckResult = await client.query<{ id: string }>(
        `
        select id
        from decks
        where id = $1::uuid and user_id = $2::uuid
        `,
        [input.deckId, input.userId]
      );

      if (!deckResult.rows[0]) {
        throw new Error("Deck not found");
      }

      const cardResult = await client.query<{ id: string }>(
        `
        insert into cards (deck_id)
        values ($1::uuid)
        returning id
        `,
        [input.deckId]
      );
      const cardId = cardResult.rows[0].id;

      for (const side of input.sides) {
        const label = side.label ?? `Side ${side.position + 1}`;
        await client.query(
          `
          insert into card_sides (card_id, label, position, content)
          values ($1::uuid, $2::text, $3::int, $4::text)
          `,
          [cardId, label, side.position, side.content]
        );
      }

      for (const tagId of input.tagIds ?? []) {
        const ownershipResult = await client.query<{ tag_deck_id: string }>(
          `
          select deck_id as tag_deck_id
          from tags
          where id = $1::uuid
          `,
          [tagId]
        );
        const ownership = ownershipResult.rows[0];

        if (!ownership) {
          throw httpError("Tag not found", 404);
        }

        if (ownership.tag_deck_id !== input.deckId) {
          throw httpError("Card and tag must belong to the same deck", 400);
        }

        await client.query(
          `
          insert into card_tags (card_id, tag_id)
          values ($1::uuid, $2::uuid)
          on conflict (card_id, tag_id) do nothing
          `,
          [cardId, tagId]
        );
      }

      return { id: cardId };
    });
  }

  async updateCard(input: UpdateCardInput) {
    await this.database.transaction(async (client) => {
      const cardResult = await client.query<{ id: string }>(
        `
        select id
        from cards
        where id = $1::uuid
        for update
        `,
        [input.cardId]
      );

      if (!cardResult.rows[0]) {
        throw new Error("Card not found");
      }

      for (const side of input.sides) {
        const label = side.label ?? `Side ${side.position + 1}`;
        await client.query(
          `
          insert into card_sides (card_id, label, position, content)
          values ($1::uuid, $2::text, $3::int, $4::text)
          on conflict (card_id, position) do update
          set content = excluded.content,
              label = excluded.label
          `,
          [input.cardId, label, side.position, side.content]
        );
      }

      await client.query(
        `
        update cards
        set updated_at = now()
        where id = $1::uuid
        `,
        [input.cardId]
      );
    });

    return { id: input.cardId };
  }

  async deleteCard(cardId: string) {
    await this.database.query(
      `
      delete from cards
      where id = $1::uuid
      `,
      [cardId]
    );

    return { id: cardId };
  }

  async createTag(deckId: string, name: string) {
    const result = await this.database.query<{ id: string; name: string }>(
      `
      insert into tags (deck_id, name)
      values ($1::uuid, lower($2::text))
      on conflict (deck_id, (lower(name))) do update
      set name = excluded.name
      returning id, name
      `,
      [deckId, name.trim()]
    );

    return result.rows[0];
  }

  async addTagToCard(cardId: string, tagId: string) {
    const ownershipResult = await this.database.query<{
      card_deck_id: string;
      tag_deck_id: string;
    }>(
      `
      select c.deck_id as card_deck_id, t.deck_id as tag_deck_id
      from cards c
      cross join tags t
      where c.id = $1::uuid
        and t.id = $2::uuid
      `,
      [cardId, tagId]
    );
    const ownership = ownershipResult.rows[0];

    if (!ownership) {
      throw httpError("Card or tag not found", 404);
    }

    if (ownership.card_deck_id !== ownership.tag_deck_id) {
      throw httpError("Card and tag must belong to the same deck", 400);
    }

    await this.database.query(
      `
      insert into card_tags (card_id, tag_id)
      values ($1::uuid, $2::uuid)
      on conflict (card_id, tag_id) do nothing
      `,
      [cardId, tagId]
    );

    return { cardId, tagId };
  }

  async removeTagFromCard(cardId: string, tagId: string) {
    await this.database.query(
      `
      delete from card_tags
      where card_id = $1::uuid
        and tag_id = $2::uuid
      `,
      [cardId, tagId]
    );

    return { cardId, tagId };
  }

  async getCardDetail(cardId: string) {
    const result = await this.database.query<CardDetailRow>(
      `
      select
        c.id,
        c.created_at,
        c.updated_at,
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
            where cs.card_id = c.id
          ),
          '[]'::jsonb
        ) as sides,
        coalesce(
          (
            select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name)
            from card_tags ct
            join tags t on t.id = ct.tag_id
            where ct.card_id = c.id
          ),
          '[]'::jsonb
        ) as tags,
        (
          select count(*)
          from review_logs rl
          where rl.card_id = c.id
        ) as review_count,
        (
          select max(rl.reviewed_at)
          from review_logs rl
          where rl.card_id = c.id
        ) as last_review,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'rating', recent.rating,
                'reviewedAt', recent.reviewed_at
              )
              order by recent.reviewed_at desc
            )
            from (
              select rating, reviewed_at
              from review_logs rl
              where rl.card_id = c.id
              order by reviewed_at desc
              limit 10
            ) recent
          ),
          '[]'::jsonb
        ) as recent_ratings,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'reviewTypeId', rtc.review_type_id,
                'reviewTypeName', rt.name,
                'state', rtc.state,
                'stability', rtc.stability,
                'difficulty', rtc.difficulty,
                'due', rtc.due,
                'reps', rtc.reps,
                'lapses', rtc.lapses,
                'lastReview', rtc.last_review,
                'learningStatus', rtc.learning_status
              )
              order by rt.created_at
            )
            from review_type_cards rtc
            join review_types rt on rt.id = rtc.review_type_id
            where rtc.card_id = c.id
          ),
          '[]'::jsonb
        ) as review_states
      from cards c
      where c.id = $1::uuid
      `,
      [cardId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sides: row.sides,
      tags: row.tags,
      reviewCount: Number(row.review_count),
      lastReview: row.last_review,
      recentRatings: row.recent_ratings,
      reviewStates: row.review_states
    };
  }
}
