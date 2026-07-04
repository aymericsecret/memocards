import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env.js";
import { registerHealthRoutes } from "./routes/health.js";

export async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN
  });

  await app.register(registerHealthRoutes);

  return app;
}
