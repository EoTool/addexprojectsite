import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as typeof globalThis & { addexPool?: Pool }

if (!process.env.DATABASE_URL) {
  throw new Error("A conexão com o banco não está configurada.")
}

export const pool =
  globalForDb.addexPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.addexPool = pool
}

export const db = drizzle(pool, { schema })
