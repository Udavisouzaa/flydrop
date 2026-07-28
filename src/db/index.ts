// Erro de build se este módulo for parar num bundle de cliente. A connection
// string do Postgres não pode chegar ao navegador em hipótese alguma, e um
// `import` distraído num componente client é tudo o que separa os dois mundos.
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Conexão Postgres direta com o banco do Supabase, para consultas que se
 * beneficiam do query builder do Drizzle (joins complexos, estatísticas
 * agregadas) em vez do cliente JS do Supabase.
 *
 * ⚠️ ESTA CONEXÃO IGNORA RLS POR COMPLETO. Ela fala com o Postgres como dono
 * do banco, então nenhuma policy de `supabase/migrations/` se aplica — não
 * existe `auth.uid()` aqui. Toda leitura ou escrita ligada a um usuário
 * específico deve continuar passando por `src/utils/supabase/server.ts`, que
 * carrega a sessão e respeita as policies. Use isto só para trabalho que
 * legitimamente enxerga a base inteira (relatórios, jobs), e sempre filtrando
 * o dono do dado na mão.
 *
 * Hoje nada no app importa este módulo — `src/lib/utils/matching.ts`, que o
 * comentário antigo citava, usa o cliente Supabase normal.
 *
 * Requer DATABASE_URL (ver .env.local.example): a "Connection string" em
 * Project Settings > Database, de preferência a do transaction pooler
 * (porta 6543) por causa do ambiente serverless.
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

/**
 * Preguiçoso de propósito. Como `const db = drizzle(getPool())`, o pool era
 * aberto — e o erro de DATABASE_URL ausente era lançado — no momento em que
 * qualquer coisa importasse este arquivo, mesmo sem chegar a consultar nada.
 * Agora a conexão só acontece quando alguém realmente vai usá-la.
 */
export function getDb() {
  return drizzle(getPool(), { schema });
}

export * as schema from "./schema";
