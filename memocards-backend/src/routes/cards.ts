import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import { CardsRepository } from "../repositories/cards.repository.js";

const cardSideSchema = z.object({
  position: z.number().int().min(0),
  label: z.string().min(1).optional(),
  content: z.string()
});

const createCardParamsSchema = z.object({
  deckId: z.string().uuid()
});

const updateCardParamsSchema = z.object({
  cardId: z.string().uuid()
});

const cardTagParamsSchema = z.object({
  cardId: z.string().uuid(),
  tagId: z.string().uuid()
});

const tagParamsSchema = z.object({
  tagId: z.string().uuid()
});

const createTagParamsSchema = z.object({
  deckId: z.string().uuid()
});

const createCardBodySchema = z.object({
  sides: z.array(cardSideSchema).min(1),
  tagIds: z.array(z.string().uuid()).default([])
});

const updateCardBodySchema = z.object({
  sides: z.array(cardSideSchema).min(1)
});

const createTagBodySchema = z.object({
  name: z.string().trim().min(1)
});

export async function registerCardRoutes(app: FastifyInstance) {
  app.post("/decks/:deckId/cards", async (request, reply) => {
    const params = createCardParamsSchema.parse(request.params);
    const body = createCardBodySchema.parse(request.body);
    const repository = Container.get(CardsRepository);

    const card = await repository.createCard({
      userId: request.userId,
      deckId: params.deckId,
      sides: body.sides,
      tagIds: body.tagIds
    });

    return reply.status(201).send(card);
  });

  app.patch("/cards/:cardId", async (request) => {
    const params = updateCardParamsSchema.parse(request.params);
    const body = updateCardBodySchema.parse(request.body);
    const repository = Container.get(CardsRepository);

    return repository.updateCard({
      cardId: params.cardId,
      sides: body.sides
    });
  });

  app.delete("/cards/:cardId", async (request) => {
    const params = updateCardParamsSchema.parse(request.params);
    const repository = Container.get(CardsRepository);

    return repository.deleteCard(params.cardId);
  });

  app.post("/decks/:deckId/tags", async (request, reply) => {
    const params = createTagParamsSchema.parse(request.params);
    const body = createTagBodySchema.parse(request.body);
    const repository = Container.get(CardsRepository);

    const tag = await repository.createTag(params.deckId, body.name);
    return reply.status(201).send(tag);
  });

  app.patch("/tags/:tagId", async (request, reply) => {
    const params = tagParamsSchema.parse(request.params);
    const body = createTagBodySchema.parse(request.body);
    const repository = Container.get(CardsRepository);
    const tag = await repository.updateTag(params.tagId, body.name);

    if (!tag) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Tag not found"
      });
    }

    return tag;
  });

  app.delete("/tags/:tagId", async (request, reply) => {
    const params = tagParamsSchema.parse(request.params);
    const repository = Container.get(CardsRepository);
    const result = await repository.deleteTag(params.tagId);

    if (!result.id) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Tag not found"
      });
    }

    return result;
  });

  app.put("/cards/:cardId/tags/:tagId", async (request) => {
    const params = cardTagParamsSchema.parse(request.params);
    const repository = Container.get(CardsRepository);

    return repository.addTagToCard(params.cardId, params.tagId);
  });

  app.delete("/cards/:cardId/tags/:tagId", async (request) => {
    const params = cardTagParamsSchema.parse(request.params);
    const repository = Container.get(CardsRepository);

    return repository.removeTagFromCard(params.cardId, params.tagId);
  });

  app.get("/cards/:cardId/detail", async (request, reply) => {
    const params = updateCardParamsSchema.parse(request.params);
    const repository = Container.get(CardsRepository);
    const card = await repository.getCardDetail(params.cardId);

    if (!card) {
      return reply.status(404).send({
        error: "Not Found",
        message: "Card not found"
      });
    }

    return { card };
  });
}
