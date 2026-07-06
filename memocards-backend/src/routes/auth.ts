import type { FastifyInstance } from "fastify";
import { Container } from "typedi";
import { z } from "zod";
import {
  authenticateRequest,
  createAuthToken,
  hashPassword,
  verifyPassword
} from "../auth.js";
import { UsersRepository } from "../repositories/users.repository.js";

const credentialsSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8)
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1).optional()
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).nullable()
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

function toAuthResponse(user: { display_name: string | null; email: string; id: string }) {
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name
    },
    token: createAuthToken(user.id)
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const repository = Container.get(UsersRepository);
    const existingUser = await repository.findByEmail(body.email);

    if (existingUser) {
      return reply.status(409).send({
        error: "Conflict",
        message: "An account already exists for this email"
      });
    }

    const user = await repository.createWithPassword({
      displayName: body.displayName,
      email: body.email,
      passwordHash: hashPassword(body.password)
    });

    return reply.status(201).send(toAuthResponse(user));
  });

  app.post("/auth/login", async (request, reply) => {
    const body = credentialsSchema.parse(request.body);
    const repository = Container.get(UsersRepository);
    const user = await repository.findByEmail(body.email);

    if (!user?.password_hash || !verifyPassword(body.password, user.password_hash)) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid email or password"
      });
    }

    return toAuthResponse(user);
  });

  app.get("/auth/me", { preHandler: authenticateRequest }, async (request) => {
    const repository = Container.get(UsersRepository);
    const user = await repository.findById(request.userId);

    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            displayName: user.display_name
          }
        : null
    };
  });

  app.patch("/auth/me", { preHandler: authenticateRequest }, async (request, reply) => {
    const body = updateProfileSchema.parse(request.body);
    const repository = Container.get(UsersRepository);
    const user = await repository.updateDisplayName(request.userId, body.displayName);

    if (!user) {
      return reply.status(404).send({
        error: "Not Found",
        message: "User not found"
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    };
  });

  app.patch("/auth/password", { preHandler: authenticateRequest }, async (request, reply) => {
    const body = updatePasswordSchema.parse(request.body);
    const repository = Container.get(UsersRepository);
    const user = await repository.findById(request.userId);

    if (!user?.password_hash || !verifyPassword(body.currentPassword, user.password_hash)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid current password"
      });
    }

    await repository.updatePassword(request.userId, hashPassword(body.newPassword));

    return { ok: true };
  });
}
