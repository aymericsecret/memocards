import "reflect-metadata";
import { Container } from "typedi";
import { Database } from "./database.js";
import { env, parseEnv } from "./env.js";
import { buildServer } from "./server.js";

parseEnv();
const app = await buildServer();

const shutdown = async () => {
  await app.close();
  await Container.get(Database).close();
};

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await app.listen({
  host: env.HOST,
  port: env.PORT
});
