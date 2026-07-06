import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";
import { parseEnv } from "../../src/env.js";

type CsvRow = Record<string, string>;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "data");

const tableFiles = {
  cardSides: "card_sides",
  cardTags: "card_tags",
  cards: "cards",
  deckSideTemplates: "deck_side_templates",
  decks: "decks",
  reviewLogs: "review_logs",
  reviewTypeCards: "review_type_cards",
  reviewTypes: "review_types",
  tags: "tags"
} as const;

function emptyToNull(value: string | undefined) {
  if (value === undefined || value === "") return null;
  return value;
}

function numberOrDefault(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  return Number(value);
}

function intOrDefault(value: string | undefined, fallback: number) {
  return Math.trunc(numberOrDefault(value, fallback));
}

function parseRatings(value: string | undefined) {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]") return [];

  return trimmed
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((rating) => Number(rating.trim()))
    .filter((rating) => Number.isFinite(rating));
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ";" && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((candidate) =>
    candidate.some((value) => value.length > 0)
  );
  if (!headers) return [];

  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""]))
  );
}

function keepFirstBy(rows: CsvRow[], key: (row: CsvRow) => string, label: string) {
  const seen = new Set<string>();
  const deduplicated: CsvRow[] = [];
  let ignoredCount = 0;

  for (const row of rows) {
    const rowKey = key(row);
    if (seen.has(rowKey)) {
      ignoredCount += 1;
      continue;
    }

    seen.add(rowKey);
    deduplicated.push(row);
  }

  if (ignoredCount > 0) {
    console.log(`Ignored ${ignoredCount} duplicate ${label} rows, keeping the first occurrence`);
  }

  return deduplicated;
}

function keepRows(rows: CsvRow[], predicate: (row: CsvRow) => boolean, label: string) {
  const kept: CsvRow[] = [];
  let ignoredCount = 0;

  for (const row of rows) {
    if (predicate(row)) {
      kept.push(row);
    } else {
      ignoredCount += 1;
    }
  }

  if (ignoredCount > 0) {
    console.log(`Ignored ${ignoredCount} ${label} rows with missing references`);
  }

  return kept;
}

async function readTable(tableName: string) {
  const files = await readdir(dataDir);
  const fileName = files
    .filter((file) => file.startsWith(`${tableName}-`) && file.endsWith(".csv"))
    .sort()
    .at(-1);

  if (!fileName) {
    throw new Error(`Missing CSV export for table "${tableName}" in ${dataDir}`);
  }

  const content = await readFile(join(dataDir, fileName), "utf8");
  const rows = parseCsv(content);
  console.log(`Loaded ${rows.length} rows from ${fileName}`);
  return rows;
}

async function insertUsers(client: PoolClient, tables: CsvRow[][]) {
  const userIds = new Set<string>();
  for (const rows of tables) {
    for (const row of rows) {
      if (row.user_id) userIds.add(row.user_id);
    }
  }

  for (const userId of userIds) {
    await client.query(
      `
      insert into users (id, email, display_name)
      values ($1::uuid, $2::citext, $3::text)
      on conflict (id) do update
      set email = coalesce(users.email, excluded.email),
          display_name = coalesce(users.display_name, excluded.display_name)
      `,
      [userId, `${userId}@imported.memocards.local`, "Imported user"]
    );
  }

  console.log(`Imported ${userIds.size} users`);
}

async function setUpdatedAtTriggers(client: PoolClient, enabled: boolean) {
  const action = enabled ? "enable" : "disable";
  const triggers = [
    ["users", "update_users_updated_at"],
    ["decks", "update_decks_updated_at"],
    ["deck_side_templates", "update_deck_side_templates_updated_at"],
    ["cards", "update_cards_updated_at"],
    ["card_sides", "update_card_sides_updated_at"],
    ["tags", "update_tags_updated_at"],
    ["review_types", "update_review_types_updated_at"],
    ["review_type_cards", "update_review_type_cards_updated_at"]
  ];

  for (const [table, trigger] of triggers) {
    await client.query(`alter table ${table} ${action} trigger ${trigger}`);
  }
}

async function importOriginalData() {
  const env = parseEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const decks = await readTable(tableFiles.decks);
    const deckSideTemplates = await readTable(tableFiles.deckSideTemplates);
    const cards = await readTable(tableFiles.cards);
    const cardSides = keepFirstBy(
      await readTable(tableFiles.cardSides),
      (row) => `${row.card_id}:${row.position}`,
      "card_sides"
    );
    const tags = await readTable(tableFiles.tags);
    const reviewTypes = await readTable(tableFiles.reviewTypes);
    const cardTags = await readTable(tableFiles.cardTags);
    const reviewTypeCards = await readTable(tableFiles.reviewTypeCards);
    const reviewLogs = await readTable(tableFiles.reviewLogs);

    const deckIds = new Set(decks.map((row) => row.id));
    const validDeckSideTemplates = keepRows(
      deckSideTemplates,
      (row) => deckIds.has(row.deck_id),
      "deck_side_templates"
    );
    const validCards = keepRows(
      cards,
      (row) => deckIds.has(row.deck_id),
      "cards"
    );
    const cardIds = new Set(validCards.map((row) => row.id));
    const validCardSides = keepRows(
      cardSides,
      (row) => cardIds.has(row.card_id),
      "card_sides"
    );
    const validTags = keepRows(
      tags,
      (row) => deckIds.has(row.deck_id),
      "tags"
    );
    const tagIds = new Set(validTags.map((row) => row.id));
    const validReviewTypes = keepRows(
      reviewTypes,
      (row) => deckIds.has(row.deck_id) && (!row.tag_id || tagIds.has(row.tag_id)),
      "review_types"
    );
    const reviewTypeIds = new Set(validReviewTypes.map((row) => row.id));
    const validCardTags = keepRows(
      cardTags,
      (row) => cardIds.has(row.card_id) && tagIds.has(row.tag_id),
      "card_tags"
    );
    const validReviewTypeCards = keepRows(
      reviewTypeCards,
      (row) => reviewTypeIds.has(row.review_type_id) && cardIds.has(row.card_id),
      "review_type_cards"
    );
    const validReviewLogs = keepRows(
      reviewLogs,
      (row) => reviewTypeIds.has(row.review_type_id) && cardIds.has(row.card_id),
      "review_logs"
    );

    await client.query("begin");
    await setUpdatedAtTriggers(client, false);

    await insertUsers(client, [
      decks,
      validDeckSideTemplates,
      validCards,
      validCardSides,
      validTags,
      validReviewTypes,
      validCardTags,
      validReviewTypeCards,
      validReviewLogs
    ]);

    for (const row of decks) {
      await client.query(
        `
        insert into decks (
          id, user_id, name, description, request_retention, created_at, updated_at
        )
        values ($1::uuid, $2::uuid, $3::text, $4::text, $5::double precision, $6::timestamptz, $7::timestamptz)
        on conflict (id) do update
        set user_id = excluded.user_id,
            name = excluded.name,
            description = excluded.description,
            request_retention = excluded.request_retention,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
        [
          row.id,
          row.user_id,
          row.name,
          emptyToNull(row.description),
          numberOrDefault(row.request_retention, 0.9),
          row.created_at,
          row.updated_at
        ]
      );
    }
    console.log(`Imported ${decks.length} decks`);

    for (const row of validDeckSideTemplates) {
      await client.query(
        `
        insert into deck_side_templates (id, deck_id, label, position)
        values ($1::uuid, $2::uuid, $3::text, $4::int)
        on conflict (deck_id, position) do update
        set id = excluded.id,
            label = excluded.label,
            updated_at = now()
        `,
        [row.id, row.deck_id, row.label, intOrDefault(row.position, 0)]
      );
    }
    console.log(`Imported ${validDeckSideTemplates.length} deck side templates`);

    for (const row of validCards) {
      await client.query(
        `
        insert into cards (id, deck_id, created_at, updated_at)
        values ($1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz)
        on conflict (id) do update
        set deck_id = excluded.deck_id,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
        [row.id, row.deck_id, row.created_at, row.updated_at]
      );
    }
    console.log(`Imported ${validCards.length} cards`);

    for (const row of validCardSides) {
      await client.query(
        `
        insert into card_sides (id, card_id, label, content, position, created_at)
        values ($1::uuid, $2::uuid, $3::text, $4::text, $5::int, $6::timestamptz)
        on conflict (card_id, position) do update
        set label = excluded.label,
            content = excluded.content,
            created_at = excluded.created_at
        `,
        [
          row.id,
          row.card_id,
          row.label,
          row.content,
          intOrDefault(row.position, 0),
          row.created_at
        ]
      );
    }
    console.log(`Imported ${validCardSides.length} card sides`);

    for (const row of validTags) {
      await client.query(
        `
        insert into tags (id, deck_id, name, created_at)
        values ($1::uuid, $2::uuid, $3::text, $4::timestamptz)
        on conflict (id) do update
        set deck_id = excluded.deck_id,
            name = excluded.name,
            created_at = excluded.created_at
        `,
        [row.id, row.deck_id, row.name, row.created_at]
      );
    }
    console.log(`Imported ${validTags.length} tags`);

    for (const row of validReviewTypes) {
      await client.query(
        `
        insert into review_types (
          id, deck_id, name, front_side_position, request_retention, tag_id, created_at
        )
        values ($1::uuid, $2::uuid, $3::text, $4::int, $5::double precision, $6::uuid, $7::timestamptz)
        on conflict (id) do update
        set deck_id = excluded.deck_id,
            name = excluded.name,
            front_side_position = excluded.front_side_position,
            request_retention = excluded.request_retention,
            tag_id = excluded.tag_id,
            created_at = excluded.created_at
        `,
        [
          row.id,
          row.deck_id,
          row.name,
          intOrDefault(row.front_side_position, 0),
          numberOrDefault(row.request_retention, 0.9),
          emptyToNull(row.tag_id),
          row.created_at
        ]
      );
    }
    console.log(`Imported ${validReviewTypes.length} review types`);

    for (const row of decks) {
      if (!row.default_review_type_id) continue;
      if (!reviewTypeIds.has(row.default_review_type_id)) continue;
      await client.query(
        `
        update decks
        set default_review_type_id = $2::uuid
        where id = $1::uuid
        `,
        [row.id, row.default_review_type_id]
      );
    }
    console.log("Updated deck default review types");

    for (const row of validCardTags) {
      await client.query(
        `
        insert into card_tags (card_id, tag_id, created_at)
        values ($1::uuid, $2::uuid, $3::timestamptz)
        on conflict (card_id, tag_id) do nothing
        `,
        [row.card_id, row.tag_id, row.created_at]
      );
    }
    console.log(`Imported ${validCardTags.length} card tags`);

    for (const row of validReviewTypeCards) {
      await client.query(
        `
        insert into review_type_cards (
          id, review_type_id, card_id, stability, difficulty, elapsed_days, scheduled_days,
          reps, lapses, state, due, last_review, learning_status, recent_ratings, created_at, updated_at
        )
        values (
          $1::uuid, $2::uuid, $3::uuid, $4::double precision, $5::double precision,
          $6::int, $7::int, $8::int, $9::int, $10::smallint, $11::timestamptz,
          $12::timestamptz, $13::learning_status, $14::smallint[], $15::timestamptz, $16::timestamptz
        )
        on conflict (review_type_id, card_id) do update
        set id = excluded.id,
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
            recent_ratings = excluded.recent_ratings,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
        [
          row.id,
          row.review_type_id,
          row.card_id,
          numberOrDefault(row.stability, 0),
          numberOrDefault(row.difficulty, 0),
          intOrDefault(row.elapsed_days, 0),
          intOrDefault(row.scheduled_days, 0),
          intOrDefault(row.reps, 0),
          intOrDefault(row.lapses, 0),
          intOrDefault(row.state, 0),
          row.due,
          emptyToNull(row.last_review),
          row.learning_status || "new",
          parseRatings(row.recent_ratings),
          row.created_at,
          row.updated_at
        ]
      );
    }
    console.log(`Imported ${validReviewTypeCards.length} review type cards`);

    for (const row of validReviewLogs) {
      await client.query(
        `
        insert into review_logs (
          id, review_type_id, review_type_card_id, card_id, rating, previous_state,
          previous_due, next_state, next_due, stability, difficulty, elapsed_days,
          scheduled_days, reviewed_at
        )
        values (
          $1::uuid,
          $2::uuid,
          (
            select id
            from review_type_cards
            where review_type_id = $2::uuid
              and card_id = $3::uuid
            limit 1
          ),
          $3::uuid, $4::smallint, $5::smallint, $6::timestamptz, $5::smallint,
          $6::timestamptz, $7::double precision, $8::double precision, $9::int,
          $10::int, $11::timestamptz
        )
        on conflict (id) do update
        set review_type_id = excluded.review_type_id,
            review_type_card_id = excluded.review_type_card_id,
            card_id = excluded.card_id,
            rating = excluded.rating,
            previous_state = excluded.previous_state,
            previous_due = excluded.previous_due,
            next_state = excluded.next_state,
            next_due = excluded.next_due,
            stability = excluded.stability,
            difficulty = excluded.difficulty,
            elapsed_days = excluded.elapsed_days,
            scheduled_days = excluded.scheduled_days,
            reviewed_at = excluded.reviewed_at
        `,
        [
          row.id,
          row.review_type_id,
          row.card_id,
          intOrDefault(row.rating, 1),
          intOrDefault(row.state, 0),
          row.due || row.reviewed_at,
          numberOrDefault(row.stability, 0),
          numberOrDefault(row.difficulty, 0),
          intOrDefault(row.elapsed_days, 0),
          intOrDefault(row.scheduled_days, 0),
          row.reviewed_at
        ]
      );
    }
    console.log(`Imported ${validReviewLogs.length} review logs`);

    await setUpdatedAtTriggers(client, true);
    await client.query("commit");
    console.log("Original data import completed.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void importOriginalData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
