import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import { env } from "../env.js";
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

const createCardBodySchema = z.object({
  sides: z.array(cardSideSchema).min(1)
});

const updateCardBodySchema = z.object({
  sides: z.array(cardSideSchema).min(1)
});

export async function registerCardRoutes(app: FastifyInstance) {
  app.post("/decks/:deckId/cards", async (request, reply) => {
    const params = createCardParamsSchema.parse(request.params);
    const body = createCardBodySchema.parse(request.body);
    const repository = Container.get(CardsRepository);

    const card = await repository.createCard({
      userId: env.DEFAULT_USER_ID,
      deckId: params.deckId,
      sides: body.sides
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
}
