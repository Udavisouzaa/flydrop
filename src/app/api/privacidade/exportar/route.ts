import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { DPO_EMAIL, TERMS_VERSION } from "@/lib/legal";

/**
 * LGPD Art. 18, II and V — access and portability.
 *
 * Returns everything the platform holds about the caller as a single JSON
 * download. JSON because Art. 18 §5 asks for a format that is interoperable and
 * machine-readable; a PDF would satisfy "access" and fail "portability".
 *
 * Two rules govern what goes in here:
 *
 *   1. Only the caller's own data. Never a third party's. That is why messages
 *      are filtered by `sender_id` rather than by match — a conversation
 *      contains the counterpart's words, and those are their personal data, not
 *      the caller's to export.
 *
 *   2. Only what the caller could already see. Every query below runs through
 *      the *user's* client, so RLS is the backstop. If a policy would deny a
 *      row, the export does not include it either — a bug here can therefore
 *      never widen visibility beyond what the app already grants.
 *
 * Read-only: nothing in this handler writes.
 */

/** A table that may legitimately not exist yet in a given environment. */
type Section = {
  key: string;
  /** Human-readable note that travels with the data. */
  label: string;
  /**
   * PromiseLike, not Promise: a Supabase query builder is thenable but is not
   * an actual Promise until it is awaited.
   */
  load: () => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Per-user only. There is no IP limit here on purpose: this endpoint is
  // useless without a session, and an authenticated identity is the meaningful
  // unit to bound. Three per hour is generous for a human and hostile to a
  // script trying to use the export as a cheap way to dump the DB repeatedly.
  const limit = await rateLimit("exportByUser", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          "Você já pediu suas informações há pouco. Tente novamente mais tarde.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const uid = user.id;

  const sections: Section[] = [
    {
      key: "perfil",
      label: "Seu perfil público e os contadores de reputação.",
      load: () => supabase.from("profiles").select("*").eq("id", uid),
    },
    {
      key: "viagens",
      label: "Viagens que você publicou.",
      load: () => supabase.from("trips").select("*").eq("traveler_id", uid),
    },
    {
      key: "pedidos",
      label: "Pedidos que você publicou.",
      load: () => supabase.from("orders").select("*").eq("requester_id", uid),
    },
    {
      key: "mensagens_enviadas",
      label:
        "Mensagens que você enviou. As mensagens recebidas pertencem a quem as escreveu e não são exportadas aqui.",
      load: () => supabase.from("messages").select("*").eq("sender_id", uid),
    },
    {
      key: "avaliacoes_escritas",
      label: "Avaliações que você escreveu sobre outras pessoas.",
      load: () => supabase.from("reviews").select("*").eq("reviewer_id", uid),
    },
    {
      key: "avaliacoes_recebidas",
      label: "Avaliações escritas sobre você.",
      load: () => supabase.from("reviews").select("*").eq("reviewed_user_id", uid),
    },
    {
      key: "notificacoes",
      label: "Notificações geradas para você.",
      load: () => supabase.from("notifications").select("*").eq("user_id", uid),
    },
  ];

  const dados: Record<string, unknown> = {};
  const indisponivel: string[] = [];

  for (const section of sections) {
    const { data, error } = await section.load();
    if (error) {
      // A missing table in a given environment must not fail the whole export
      // — the user still has a right to everything else.
      console.error(`[exportar] ${section.key} indisponível`, error.message);
      indisponivel.push(section.key);
      continue;
    }
    dados[section.key] = { descricao: section.label, registros: data ?? [] };
  }

  // Matches and payments need a join to be scoped to this user, so they are
  // built separately from the simple owner-column sections above.
  const { data: matches } = await supabase
    .from("matches")
    .select("*, trips(traveler_id), orders(requester_id)");

  const meusMatches = (matches ?? [])
    .filter((m) => {
      const trip = m.trips as { traveler_id?: string } | null;
      const order = m.orders as { requester_id?: string } | null;
      return trip?.traveler_id === uid || order?.requester_id === uid;
    })
    .map((m) => {
      // The joined rows were only ever a filter. Drop them so the export shows
      // the match's own columns and nothing borrowed from the counterpart.
      const rest: Record<string, unknown> = { ...m };
      delete rest.trips;
      delete rest.orders;
      return rest;
    });

  dados.matches = {
    descricao: "Conexões entre uma viagem e um pedido das quais você faz parte.",
    registros: meusMatches,
  };

  const { data: pagamentos, error: pagamentosError } = await supabase
    .from("payments")
    .select("*")
    .or(`payer_id.eq.${uid},payee_id.eq.${uid}`);

  if (pagamentosError) {
    console.error("[exportar] payments indisponível", pagamentosError.message);
    indisponivel.push("pagamentos");
  } else {
    dados.pagamentos = {
      descricao:
        "Taxas de conexão. Nenhum dado de cartão é armazenado — a cobrança é por Pix, no provedor de pagamento.",
      registros: pagamentos ?? [],
    };
  }

  const payload = {
    gerado_em: new Date().toISOString(),
    titular: {
      id: uid,
      email: user.email ?? null,
      criado_em: user.created_at ?? null,
      ultimo_acesso: user.last_sign_in_at ?? null,
      termos_aceitos_em: user.user_metadata?.terms_accepted_at ?? null,
      termos_versao: user.user_metadata?.terms_version ?? null,
      termos_versao_atual: TERMS_VERSION,
    },
    sobre:
      "Cópia dos dados pessoais tratados pelo LevAí sobre você, nos termos do art. 18, II e V da Lei 13.709/2018 (LGPD). Contém apenas dados seus: conteúdo de terceiros foi omitido.",
    dados,
    ...(indisponivel.length > 0
      ? {
          observacao: `Não foi possível ler as seções: ${indisponivel.join(
            ", "
          )}. Escreva para ${DPO_EMAIL} e resolvemos manualmente.`,
        }
      : {}),
  };

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="levai-meus-dados-${date}.json"`,
      // Belt and braces: next.config.ts already sets no-store on /api/*, but
      // this response is the single most sensitive body the app ever emits.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
