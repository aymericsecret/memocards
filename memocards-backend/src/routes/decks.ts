import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import {
  DeckCardsRepository,
  reviewGroupKeys
} from "../repositories/deck-cards.repository.js";

const cardsQuerySchema = z.object({
  search: z.string().optional(),
  tagIds: z.string().optional(),
  reviewTypeId: z.string().uuid().optional(),
  groups: z.string().optional(),
  sideFilled: z.string().optional(),
  sideEmpty: z.string().optional(),
  sortField: z.enum(["created_at", "last_review"]).default("created_at"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const paramsSchema = z.object({
  deckId: z.string().uuid()
});

function parseCsv(value: string | undefined) {
  if (!value) return null;

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : null;
}

function parseIntegerCsv(value: string | undefined) {
  const values = parseCsv(value);
  if (!values) return null;

  return values.map((item) => z.coerce.number().int().min(0).parse(item));
}

function parseReviewGroups(value: string | undefined) {
  const values = parseCsv(value);
  if (!values) return null;

  return values.map((group) => z.enum(reviewGroupKeys).parse(group));
}

export async function registerDeckRoutes(app: FastifyInstance) {
  app.get("/decks/:deckId/cards", async (request) => {
    const params = paramsSchema.parse(request.params);
    const query = cardsQuerySchema.parse(request.query);
    const repository = Container.get(DeckCardsRepository);

    return repository.searchDeckCards({
      deckId: params.deckId,
      search: query.search,
      tagIds: parseCsv(query.tagIds),
      reviewTypeId: query.reviewTypeId ?? null,
      reviewGroups: parseReviewGroups(query.groups),
      sideFilledPositions: parseIntegerCsv(query.sideFilled),
      sideEmptyPositions: parseIntegerCsv(query.sideEmpty),
      sortField: query.sortField,
      sortDir: query.sortDir,
      limit: query.pageSize,
      offset: query.page * query.pageSize
    });
  });
}
