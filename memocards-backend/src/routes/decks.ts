import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import { env } from "../env.js";
import {
  DeckCardsRepository,
  reviewGroupKeys
} from "../repositories/deck-cards.repository.js";
import { DecksRepository } from "../repositories/decks.repository.js";

const cardsQuerySchema = z.object({
  search: z.string().optional(),
  tagIds: z.string().optional(),
  statuses: z.string().optional(),
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

const createDeckBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  sideLabels: z.array(z.string().trim().min(1)).min(2).default(["Recto", "Verso"])
});

const updateDeckBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  requestRetention: z.number().min(0.7).max(0.97)
});

const updateDeckSideTemplatesBodySchema = z.object({
  sideLabels: z.array(z.string().trim().min(1)).min(2)
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

function parseLearningStatuses(value: string | undefined) {
  const values = parseCsv(value);
  if (!values) return null;

  return values.map((status) => z.enum(["new", "learning", "known"]).parse(status));
}

export async function registerDeckRoutes(app: FastifyInstance) {
  app.get("/decks", async () => {
    const repository = Container.get(DecksRepository);
    return { decks: await repository.listDecks(env.DEFAULT_USER_ID) };
  });

  app.post("/decks", async (request, reply) => {
    const body = createDeckBodySchema.parse(request.body);
    const repository = Container.get(DecksRepository);
    const deck = await repository.createDeck({
      userId: env.DEFAULT_USER_ID,
      name: body.name,
      description: body.description,
      sideLabels: body.sideLabels
    });

    return reply.status(201).send(deck);
  });

  app.get("/decks/:deckId", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(DecksRepository);
    const deck = await repository.getDeck(params.deckId, env.DEFAULT_USER_ID);

    if (!deck) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck not found"
      });
    }

    return { deck };
  });

  app.delete("/decks/:deckId", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(DecksRepository);
    const result = await repository.deleteDeck(params.deckId, env.DEFAULT_USER_ID);

    if (!result.id) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck not found"
      });
    }

    return result;
  });

  app.patch("/decks/:deckId", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = updateDeckBodySchema.parse(request.body);
    const repository = Container.get(DecksRepository);
    const deck = await repository.updateDeck({
      deckId: params.deckId,
      userId: env.DEFAULT_USER_ID,
      name: body.name,
      description: body.description,
      requestRetention: body.requestRetention
    });

    if (!deck) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck not found"
      });
    }

    return deck;
  });

  app.patch("/decks/:deckId/side-templates", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = updateDeckSideTemplatesBodySchema.parse(request.body);
    const repository = Container.get(DecksRepository);
    const deck = await repository.updateDeckSideTemplates({
      deckId: params.deckId,
      userId: env.DEFAULT_USER_ID,
      sideLabels: body.sideLabels
    });

    if (!deck) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck not found"
      });
    }

    return deck;
  });

  app.get("/decks/:deckId/stats", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(DecksRepository);
    const stats = await repository.getDeckStats(params.deckId, env.DEFAULT_USER_ID);

    if (!stats) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck not found"
      });
    }

    return stats;
  });

  app.get("/decks/:deckId/cards", async (request) => {
    const params = paramsSchema.parse(request.params);
    const query = cardsQuerySchema.parse(request.query);
    const repository = Container.get(DeckCardsRepository);

    return repository.searchDeckCards({
      deckId: params.deckId,
      search: query.search,
      tagIds: parseCsv(query.tagIds),
      learningStatuses: parseLearningStatuses(query.statuses),
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
