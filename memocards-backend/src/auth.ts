import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Container } from "typedi";
import { env } from "./env.js";
import { UsersRepository } from "./repositories/users.repository.js";

const passwordIterations = 120_000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";
const tokenLifetimeMs = 1000 * 60 * 60 * 24 * 7;

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

function sign(value: string) {
  return createHmac("sha256", env.AUTH_TOKEN_SECRET).update(value).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(
    password,
    salt,
    passwordIterations,
    passwordKeyLength,
    passwordDigest
  ).toString("base64url");

  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, iterationsValue, salt, expectedHash] = passwordHash.split(":");
  const iterations = Number(iterationsValue);

  if (algorithm !== "pbkdf2" || !Number.isInteger(iterations) || !salt || !expectedHash) {
    return false;
  }

  const actual = pbkdf2Sync(
    password,
    salt,
    iterations,
    passwordKeyLength,
    passwordDigest
  );
  const expected = Buffer.from(expectedHash, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAuthToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + tokenLifetimeMs,
      sub: userId
    })
  ).toString("base64url");
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
      sub?: string;
    };

    if (!decoded.sub || !decoded.exp || decoded.exp < Date.now()) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const userId = token ? verifyAuthToken(token) : null;

  if (!userId) {
    if (env.NODE_ENV !== "production") {
      request.userId = env.DEFAULT_USER_ID;
      return;
    }

    await reply.status(401).send({
      error: "Unauthorized",
      message: "Authentication required"
    });
    return;
  }

  const repository = Container.get(UsersRepository);
  const user = await repository.findById(userId);

  if (!user) {
    await reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid authentication token"
    });
    return;
  }

  request.userId = userId;
}
