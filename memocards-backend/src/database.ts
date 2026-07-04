import { Pool } from "pg";
import { Service } from "typedi";
import { env } from "./env.js";

@Service()
export class Database {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL
    });
  }

  async healthcheck() {
    await this.pool.query("select 1");
  }

  async close() {
    await this.pool.end();
  }
}
