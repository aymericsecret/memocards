import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import {
  reviewGroupKeys
} from "../repositories/deck-cards.repository.js";
import { ReviewQueueRepository } from "../repositories/review-queue.repository.js";

const paramsSchema = z.object({
  reviewTypeId: z.string().uuid()
});

const dueCardsQuerySchema = z.object({
  groups: z.string().optional(),
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
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

export async function registerReviewTypeRoutes(app: FastifyInstance) {
  app.get("/review-types/:reviewTypeId/due-cards", async (request) => {
    const params = paramsSchema.parse(request.params);
    const query = dueCardsQuerySchema.parse(request.query);
    const repository = Container.get(ReviewQueueRepository);

    return repository.getDueReviewCards({
      reviewTypeId: params.reviewTypeId,
      groups: parseReviewGroups(query.groups),
      limit: query.pageSize,
      offset: query.page * query.pageSize
    });
  });
}
