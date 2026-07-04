import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { registerCardRoutes } from "./routes/cards.js";
import { registerDeckRoutes } from "./routes/decks.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerReviewTypeRoutes } from "./routes/review-types.js";

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        error: "Bad Request",
        message: "Invalid request parameters",
        issues: error.issues
      });
      return;
    }

    request.log.error(error);
    void reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected server error"
    });
  });

  await app.register(registerHealthRoutes);
  await app.register(registerDeckRoutes, { prefix: "/api" });
  await app.register(registerCardRoutes, { prefix: "/api" });
  await app.register(registerReviewTypeRoutes, { prefix: "/api" });

  return app;
}
