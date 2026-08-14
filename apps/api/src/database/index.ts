import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to connect to PostgreSQL");
}

const client = postgres(databaseUrl);

export const database = drizzle(client, { schema });
export type Database = typeof database;

export async function closeDatabase() {
  await client.end();
}
