import "dotenv/config";
import { z } from "zod";

export const envVariablesSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DEFAULT_USER_ID: z.string().uuid().default("00000000-0000-0000-0000-000000000001")
});

export type Env = z.infer<typeof envVariablesSchema>;

export let env: Env;

export const parseEnv = ({
  testing = false
}: { testing?: boolean } = {}): Env => {
  if (testing) {
    env = envVariablesSchema.parse({
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://memocards:memocards@localhost:5432/memocards?sslmode=disable",
      CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
      PORT: process.env.PORT ?? "8000",
      DEFAULT_USER_ID:
        process.env.DEFAULT_USER_ID ?? "00000000-0000-0000-0000-000000000001"
    });

    return env;
  }

  env = envVariablesSchema.parse(process.env);
  return env;
};
