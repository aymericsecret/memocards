import { randomUUID } from "node:crypto";
import { Container, Service } from "typedi";
import { Database } from "../database.js";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string | null;
}

@Service()
export class UsersRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async findByEmail(email: string) {
    const result = await this.database.query<UserRow>(
      `
      select id, email, display_name, password_hash
      from users
      where email = $1::citext
      limit 1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  }

  async findById(userId: string) {
    const result = await this.database.query<UserRow>(
      `
      select id, email, display_name, password_hash
      from users
      where id = $1::uuid
      limit 1
      `,
      [userId]
    );

    return result.rows[0] ?? null;
  }

  async createWithPassword({
    displayName,
    email,
    passwordHash
  }: {
    displayName?: string | null;
    email: string;
    passwordHash: string;
  }) {
    const result = await this.database.query<UserRow>(
      `
      insert into users (id, email, display_name, password_hash)
      values ($1::uuid, $2::citext, $3::text, $4::text)
      returning id, email, display_name, password_hash
      `,
      [randomUUID(), email, displayName ?? null, passwordHash]
    );

    return result.rows[0];
  }
}
