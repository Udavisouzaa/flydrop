import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Direct Postgres connection to the Supabase database, for use in
 * contexts that benefit from Drizzle's query builder (complex joins,
 * matching algorithm, aggregate stats) instead of the Supabase JS client.
 *
 * Requires DATABASE_URL to be set (see .env.local.example) — this is the
 * Supabase "Connection string" (transaction pooler recommended for
 * serverless: port 6543) found in Project Settings > Database.
 *
 * Simple CRUD tied to RLS/auth should continue using
 * `src/utils/supabase/{server,client}.ts` since those respect
 * Supabase Auth's row-level security automatically. Use this Drizzle
 * client for read-heavy/reporting queries run with the service role,
 * e.g. the matching algorithm in src/lib/utils/matching.ts.
 */
declare global {
   
  var __flydropPool: Pool | undefined;
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy the pooled connection string from Supabase Project Settings > Database into .env.local"
    );
  }

  if (!global.__flydropPool) {
    global.__flydropPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });
  }
  return global.__flydropPool;
}

export const db = drizzle(getPool(), { schema });
export * as schema from "./schema";
