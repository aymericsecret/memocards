import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import { PublicDeckSharesRepository } from "../repositories/public-deck-shares.repository.js";

const deckParamsSchema = z.object({
  deckId: z.string().uuid()
});

const publicShareParamsSchema = z.object({
  token: z.string().min(16)
});

const shareParamsSchema = z.object({
  shareId: z.string().uuid()
});

const createPublicShareBodySchema = z.object({
  mode: z.enum(["ai", "people"]).default("ai"),
  reviewTypeId: z.string().uuid(),
  sidePositions: z.array(z.number().int().min(0)).min(1)
});

export async function registerPublicDeckShareRoutes(app: FastifyInstance) {
  app.get("/decks/:deckId/public-shares", async (request) => {
    const params = deckParamsSchema.parse(request.params);
    const repository = Container.get(PublicDeckSharesRepository);

    return {
      shares: await repository.listByDeck(params.deckId, request.userId)
    };
  });

  app.post("/decks/:deckId/public-shares", async (request, reply) => {
    const params = deckParamsSchema.parse(request.params);
    const body = createPublicShareBodySchema.parse(request.body);
    const repository = Container.get(PublicDeckSharesRepository);
    const share = await repository.create({
      deckId: params.deckId,
      mode: body.mode,
      reviewTypeId: body.reviewTypeId,
      sidePositions: [...new Set(body.sidePositions)].sort((a, b) => a - b),
      userId: request.userId
    });

    if (!share) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Deck or review type not found"
      });
    }

    return reply.status(201).send({ share });
  });

  app.delete("/public-shares/:shareId", async (request, reply) => {
    const params = shareParamsSchema.parse(request.params);
    const repository = Container.get(PublicDeckSharesRepository);
    const result = await repository.delete(params.shareId, request.userId);

    if (!result) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Share not found"
      });
    }

    return result;
  });
}

export async function registerPublicMarkdownRoutes(app: FastifyInstance) {
  app.get("/public/shares/:token.md", async (request, reply) => {
    const params = publicShareParamsSchema.parse(request.params);
    const repository = Container.get(PublicDeckSharesRepository);
    const markdown = await repository.getMarkdown(params.token);

    if (!markdown) {
      return reply.status(404).type("text/plain; charset=utf-8").send("Share not found");
    }

    return reply
      .type("text/markdown; charset=utf-8")
      .header("cache-control", "no-store")
      .send(markdown);
  });
}
