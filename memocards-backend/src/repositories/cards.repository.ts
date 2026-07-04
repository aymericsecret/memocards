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
}

export interface UpdateCardInput {
  cardId: string;
  sides: CardSideInput[];
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
}
