import { randomBytes } from "node:crypto";
import { Container, Service } from "typedi";
import { Database } from "../database.js";

export interface CreatePublicDeckShareInput {
  createdAfter: string | null;
  deckId: string;
  mode: "ai" | "people";
  reviewTypeId: string | null;
  sidePositions: number[];
  userId: string;
}

interface ShareRow {
  created_after: string | null;
  created_at: string;
  id: string;
  deck_id: string;
  mode: "ai" | "people";
  review_type_id: string | null;
  review_type_name: string | null;
  side_positions: number[];
  token: string;
  updated_at: string;
}

interface ShareMarkdownRow {
  deck_name: string;
  review_type_name: string | null;
  side_label: string;
  side_content: string | null;
  side_position: number;
  card_id: string;
}

export interface PublicDeckShareExport {
  cards: Array<{
    id: string;
    sides: Array<{
      content: string;
      label: string;
      position: number;
    }>;
  }>;
  createdAfter: string | null;
  deckName: string;
  mode: "ai" | "people";
  reviewTypeName: string | null;
}

@Service()
export class PublicDeckSharesRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async create(input: CreatePublicDeckShareInput) {
    const ownershipResult = await this.database.query<{ id: string }>(
      `
      select id
      from decks
      where id = $1::uuid
        and user_id = $2::uuid
      `,
      [input.deckId, input.userId]
    );

    if (!ownershipResult.rows[0]) return null;

    if (input.reviewTypeId) {
      const reviewTypeResult = await this.database.query<{ id: string }>(
        `
        select id
        from review_types
        where id = $1::uuid
          and deck_id = $2::uuid
        `,
        [input.reviewTypeId, input.deckId]
      );

      if (!reviewTypeResult.rows[0]) return null;
    }

    const token = randomBytes(24).toString("base64url");
    const result = await this.database.query<ShareRow>(
      `
      insert into public_deck_shares (
        deck_id, review_type_id, token, mode, side_positions, created_after
      )
      values ($1::uuid, $2::uuid, $3::text, $4::text, $5::int[], $6::date)
      on conflict (
        deck_id,
        mode,
        (coalesce(review_type_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        side_positions,
        (coalesce(created_after, '-infinity'::date))
      ) do update
      set updated_at = public_deck_shares.updated_at
      returning
        id,
        deck_id,
        review_type_id,
        null::text as review_type_name,
        token,
        mode,
        side_positions,
        created_after,
        created_at,
        updated_at
      `,
      [
        input.deckId,
        input.reviewTypeId,
        token,
        input.mode,
        input.sidePositions,
        input.createdAfter
      ]
    );

    return this.toShare(result.rows[0]);
  }

  async listByDeck(deckId: string, userId: string) {
    const result = await this.database.query<ShareRow>(
      `
      select
        pds.id,
        pds.deck_id,
        pds.review_type_id,
        rt.name as review_type_name,
        pds.token,
        pds.mode,
        pds.side_positions,
        pds.created_after,
        pds.created_at,
        pds.updated_at
      from public_deck_shares pds
      join decks d on d.id = pds.deck_id
      left join review_types rt on rt.id = pds.review_type_id
      where pds.deck_id = $1::uuid
        and d.user_id = $2::uuid
      order by pds.created_at desc
      `,
      [deckId, userId]
    );

    return result.rows.map((row) => this.toShare(row));
  }

  async delete(shareId: string, userId: string) {
    const result = await this.database.query<{ id: string }>(
      `
      delete from public_deck_shares pds
      using decks d
      where pds.deck_id = d.id
        and pds.id = $1::uuid
        and d.user_id = $2::uuid
      returning pds.id
      `,
      [shareId, userId]
    );

    return result.rows[0] ?? null;
  }

  async getExport(token: string): Promise<PublicDeckShareExport | null> {
    const shareResult = await this.database.query<ShareRow>(
      `
      select
        pds.id,
        pds.deck_id,
        pds.review_type_id,
        rt.name as review_type_name,
        pds.token,
        pds.mode,
        pds.side_positions,
        pds.created_after,
        pds.created_at,
        pds.updated_at
      from public_deck_shares pds
      left join review_types rt on rt.id = pds.review_type_id
      where pds.token = $1::text
      `,
      [token]
    );
    const share = shareResult.rows[0];
    if (!share) return null;

    const result = await this.database.query<ShareMarkdownRow>(
      `
      select
        d.name as deck_name,
        rt.name as review_type_name,
        cs.card_id,
        cs.label as side_label,
        cs.content as side_content,
        cs.position as side_position
      from public_deck_shares pds
      join decks d on d.id = pds.deck_id
      left join review_types rt on rt.id = pds.review_type_id
      join cards c on c.deck_id = pds.deck_id
        and (pds.created_after is null or c.created_at >= pds.created_after)
      join review_type_cards rtc
        on rtc.card_id = c.id
       and rtc.review_type_id = pds.review_type_id
       and rtc.learning_status = 'known'
      join card_sides cs
        on cs.card_id = c.id
       and cs.position = any(pds.side_positions)
       and btrim(cs.content) <> ''
      where pds.token = $1::text
      order by lower(cs.content), cs.card_id, cs.position
      `,
      [token]
    );

    const groupedCards = new Map<string, ShareMarkdownRow[]>();
    for (const row of result.rows) {
      const cardRows = groupedCards.get(row.card_id) ?? [];
      cardRows.push(row);
      groupedCards.set(row.card_id, cardRows);
    }

    return {
      cards: Array.from(groupedCards, ([id, cardRows]) => ({
        id,
        sides: cardRows
          .sort((a, b) => a.side_position - b.side_position)
          .map((row) => ({
            content: row.side_content?.trim() ?? "",
            label: row.side_label,
            position: row.side_position
          }))
          .filter((side) => Boolean(side.content))
      })).filter((card) => card.sides.length > 0),
      createdAfter: share.created_after,
      deckName: result.rows[0]?.deck_name ?? "Memocards",
      mode: share.mode,
      reviewTypeName: share.review_type_name
    };
  }

  renderMarkdown(exportedShare: PublicDeckShareExport) {

    const markdown = [
      `# ${exportedShare.deckName}`,
      "",
      exportedShare.reviewTypeName
        ? `Known cards exported from review type: **${exportedShare.reviewTypeName}**.`
        : "Known cards exported from Memocards.",
      "",
      `Share mode: ${exportedShare.mode}`,
      "",
      "## Cards",
      ""
    ];

    if (exportedShare.cards.length === 0) {
      markdown.push("_No known cards match this share yet._");
      return markdown.join("\n");
    }

    for (const card of exportedShare.cards) {
      const values = card.sides.map((side) => side.content);

      if (values.length === 1) {
        markdown.push(`- ${values[0]}`);
      } else if (values.length > 1) {
        markdown.push(`- ${values.join(" - ")}`);
      }
    }

    return markdown.join("\n");
  }

  private toShare(row: ShareRow) {
    return {
      createdAt: row.created_at,
      createdAfter: row.created_after,
      id: row.id,
      deckId: row.deck_id,
      mode: row.mode,
      reviewTypeId: row.review_type_id,
      reviewTypeName: row.review_type_name,
      sidePositions: row.side_positions,
      token: row.token,
      updatedAt: row.updated_at
    };
  }
}
