import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // We hand-write SQL migrations (see supabase/migrations/000X_*.sql) and
  // apply them via the Supabase MCP / dashboard rather than `drizzle-kit
  // migrate`, so this config is primarily used for `drizzle-kit studio`
  // (local schema browsing) and future `drizzle-kit generate` diffs.
} satisfies Config;
