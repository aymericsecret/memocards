import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import {
  reviewGroupKeys
} from "../repositories/deck-cards.repository.js";
import { ReviewQueueRepository } from "../repositories/review-queue.repository.js";
import { ReviewTypesRepository } from "../repositories/review-types.repository.js";
import { ReviewsRepository } from "../repositories/reviews.repository.js";

const paramsSchema = z.object({
  reviewTypeId: z.string().uuid()
});

const deckParamsSchema = z.object({
  deckId: z.string().uuid()
});

const createReviewTypeBodySchema = z.object({
  backSidePosition: z.number().int().min(0).nullable().optional(),
  name: z.string().trim().min(1),
  frontSidePosition: z.number().int().min(0),
  tagId: z.string().uuid().nullable().optional()
});

const updateReviewTypeBodySchema = z.object({
  backSidePosition: z.number().int().min(0).nullable().optional(),
  name: z.string().trim().min(1).optional(),
  requestRetention: z.number().min(0.7).max(0.97).optional(),
  tagId: z.string().uuid().nullable().optional()
});

const dueCardsQuerySchema = z.object({
  excludeCardIds: z.string().optional(),
  groups: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  snapshotAt: z.string().datetime().optional()
});

const submitReviewBodySchema = z.object({
  cardId: z.string().uuid(),
  rating: z.number().int().min(1).max(4)
});

function parseCsv(value: string | undefined) {
  if (!value) return null;

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : null;
}

function parseReviewGroups(value: string | undefined) {
  const values = parseCsv(value);
  if (!values) return null;

  return values.map((group) => z.enum(reviewGroupKeys).parse(group));
}

function parseUuidCsv(value: string | undefined) {
  const values = parseCsv(value);
  if (!values) return null;

  return values.map((id) => z.string().uuid().parse(id));
}

export async function registerReviewTypeRoutes(app: FastifyInstance) {
  app.get("/decks/:deckId/review-types", async (request) => {
    const params = deckParamsSchema.parse(request.params);
    const repository = Container.get(ReviewTypesRepository);

    return {
      reviewTypes: await repository.listByDeck(params.deckId)
    };
  });

  app.post("/decks/:deckId/review-types", async (request, reply) => {
    const params = deckParamsSchema.parse(request.params);
    const body = createReviewTypeBodySchema.parse(request.body);
    const repository = Container.get(ReviewTypesRepository);

    const reviewType = await repository.create({
      backSidePosition: body.backSidePosition ?? null,
      deckId: params.deckId,
      frontSidePosition: body.frontSidePosition,
      name: body.name,
      tagId: body.tagId
    });

    return reply.status(201).send(reviewType);
  });

  app.get("/review-types/:reviewTypeId", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(ReviewTypesRepository);
    const reviewType = await repository.getById(params.reviewTypeId);

    if (!reviewType) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Review type not found"
      });
    }

    return { reviewType };
  });

  app.patch("/review-types/:reviewTypeId", async (request) => {
    const params = paramsSchema.parse(request.params);
    const body = updateReviewTypeBodySchema.parse(request.body);
    const repository = Container.get(ReviewTypesRepository);

    return repository.update(params.reviewTypeId, body);
  });

  app.delete("/review-types/:reviewTypeId", async (request) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(ReviewTypesRepository);

    return repository.delete(params.reviewTypeId);
  });

  app.put("/decks/:deckId/default-review-type/:reviewTypeId", async (request) => {
    const deckParams = deckParamsSchema.parse(request.params);
    const reviewTypeParams = paramsSchema.parse(request.params);
    const repository = Container.get(ReviewTypesRepository);

    return repository.setDefault(deckParams.deckId, reviewTypeParams.reviewTypeId);
  });

  app.post("/review-types/:reviewTypeId/reset-progress", async (request) => {
    const params = paramsSchema.parse(request.params);
    const repository = Container.get(ReviewTypesRepository);

    return repository.resetProgress(params.reviewTypeId);
  });

  app.get("/review-types/:reviewTypeId/due-cards", async (request) => {
    const params = paramsSchema.parse(request.params);
    const query = dueCardsQuerySchema.parse(request.query);
    const repository = Container.get(ReviewQueueRepository);

    return repository.getDueReviewCards({
      reviewTypeId: params.reviewTypeId,
      excludeCardIds: parseUuidCsv(query.excludeCardIds),
      groups: parseReviewGroups(query.groups),
      limit: query.pageSize,
      offset: query.page * query.pageSize,
      snapshotAt: query.snapshotAt ?? new Date().toISOString()
    });
  });

  app.post("/review-types/:reviewTypeId/reviews", async (request) => {
    const params = paramsSchema.parse(request.params);
    const body = submitReviewBodySchema.parse(request.body);
    const repository = Container.get(ReviewsRepository);

    return repository.submit({
      reviewTypeId: params.reviewTypeId,
      cardId: body.cardId,
      rating: body.rating
    });
  });
}
