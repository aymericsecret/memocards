import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { Database } from "../database.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/healthcheck", async () => {
    const database = Container.get(Database);

    await database.healthcheck();

    return {
      status: "ok",
      database: "ok"
    };
  });
}
