import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ASAAS_PAID_STATUSES, fetchCharge } from "@/lib/asaas";
import { createNotification } from "@/lib/utils/notifications";

/**
 * Liquidação da taxa de conexão — o único ponto do código que destrava um match.
 *
 * Existem dois caminhos até aqui e eles precisam concordar em tudo (verificar o
 * valor, gravar `payments`, escrever `unlocked_at`, notificar as duas partes):
 *
 *   1. o webhook do Asaas (`/api/webhooks/asaas`), o caminho normal;
 *   2. a reconciliação (`/api/connection/reconcile`), para quando o webhook não
 *      chega — a Vercel estava fria, o Asaas desistiu de reentregar, e a pessoa
 *      pagou sem receber o contato.
 *
 * Duas cópias dessa lógica divergiriam na primeira correção feita só de um
 * lado, e o lado esquecido é o que deixa alguém pagando sem destravar.
 *
 * A diferença entre os dois caminhos é o quanto se pode confiar em quem chama,
 * e ela está inteiramente no parâmetro `assertedByEvent`.
 */

/**
 * Pix amounts are small and stored as numeric; a cent of float drift shouldn't
 * block a legitimate unlock, but anything larger should.
 */
const AMOUNT_TOLERANCE = 0.01;

export type SettlementOutcome =
  /** Esta chamada foi a que destravou. Só ela notifica. */
  | { status: "unlocked"; matchId: string }
  /** Pago e já destravado antes — reentrega, ou o outro caminho ganhou a corrida. */
  | { status: "already"; matchId: string }
  /** Cobrança que não é nossa, ou não é taxa de conexão. */
  | { status: "unknown_charge" }
  /** O Asaas diz que essa cobrança ainda não foi paga. */
  | { status: "unpaid"; chargeStatus: string }
  /** Pagou menos que a taxa. Reenviar o evento não muda o valor. */
  | { status: "underpaid"; expected: number; paid: number }
  /** Falha nossa: repetir a chamada mais tarde pode dar certo. */
  | { status: "error"; reason: string };

export interface SettleConnectionFeeParams {
  /** Cliente service_role: `guard_unlock_fields` recusa `unlocked_at` de qualquer outro. */
  admin: SupabaseClient;
  /** `payments.psp_charge_id` — o id da cobrança no Asaas. */
  chargeId: string;
  /**
   * Presente só no caminho do webhook, onde a entrega do evento já é o Asaas
   * afirmando que a cobrança foi paga. Serve de rede quando a leitura da API
   * falha: nesse caso o valor do payload decide, em vez de descartarmos um
   * pagamento real por causa de uma indisponibilidade momentânea.
   *
   * A reconciliação não passa nada aqui, de propósito — ela não tem nenhuma
   * afirmação além do pedido do próprio usuário, que não é evidência de nada.
   */
  assertedByEvent?: { value: number | null };
}

/**
 * Concilia uma cobrança e destrava o match, se for o caso.
 *
 * Idempotente por construção, e é isto que faz reentrega ser inofensiva: quem
 * decide não é uma leitura seguida de uma escrita — é o próprio UPDATE
 * condicional em `unlocked_at is null`. Só a chamada cujo UPDATE devolve linha
 * ganhou a corrida, e só ela notifica. As outras saem em "already".
 */
export async function settleConnectionFee({
  admin,
  chargeId,
  assertedByEvent,
}: SettleConnectionFeeParams): Promise<SettlementOutcome> {
  // Resolve o match pelos nossos próprios registros, não pelo externalReference
  // do payload — quem manda o evento não decide qual match destravar.
  const { data: paymentRow, error: lookupError } = await admin
    .from("payments")
    .select("id, match_id, payer_id, status, kind, amount_total")
    .eq("psp_charge_id", chargeId)
    .maybeSingle();

  if (lookupError) {
    console.error("[settlement] payments lookup failed", lookupError);
    return { status: "error", reason: "lookup" };
  }

  if (!paymentRow || paymentRow.kind !== "connection_fee" || !paymentRow.match_id) {
    return { status: "unknown_charge" };
  }

  const matchId = paymentRow.match_id as string;

  // Já verificado numa entrega anterior: não paga a ida ao Asaas de novo.
  //
  // Repare que isso não encerra a função. Uma liquidação que morreu entre a
  // escrita em `payments` e a escrita em `matches` deixa a cobrança paga e o
  // contato fechado, e o único jeito de curar esse estado é seguir até o
  // UPDATE lá embaixo. Sair aqui por "isso já foi processado" — que é o que o
  // código fazia antes — trancava esse match para sempre.
  if (paymentRow.status !== "succeeded") {
    const verified = await verifyPayment({
      chargeId,
      expected: Number(paymentRow.amount_total ?? 0),
      assertedByEvent,
    });
    if (verified.status !== "ok") return verified.outcome;

    const { error: paymentError } = await admin
      .from("payments")
      .update({ status: "succeeded", paid_at: new Date().toISOString() })
      .eq("id", paymentRow.id)
      // `failed` entra porque vencer e depois pagar é uma sequência real: o
      // PAYMENT_OVERDUE chega, o boleto Pix é pago no dia seguinte. `refunded`
      // fica de fora — dinheiro devolvido não volta a ser pagamento.
      .in("status", ["pending", "failed"]);

    if (paymentError) {
      console.error("[settlement] payment update failed", paymentError);
      return { status: "error", reason: "payment-update" };
    }
  }

  // O compare-and-swap que serializa tudo. Duas entregas simultâneas
  // (PAYMENT_CONFIRMED e PAYMENT_RECEIVED chegam quase juntos) passam as duas
  // pela verificação acima; aqui só uma leva linha de volta.
  const { data: unlocked, error: matchError } = await admin
    .from("matches")
    .update({
      unlocked_at: new Date().toISOString(),
      unlocked_by: paymentRow.payer_id,
    })
    .eq("id", matchId)
    .is("unlocked_at", null)
    .select("id");

  if (matchError) {
    console.error("[settlement] unlock failed", matchError);
    return { status: "error", reason: "unlock" };
  }

  if (!unlocked?.length) return { status: "already", matchId };

  await notifyBothParties(admin, matchId);

  return { status: "unlocked", matchId };
}

/**
 * Confirma que a cobrança foi mesmo paga, e pelo valor certo.
 *
 * A taxa de conexão é a única receita da Malotex, então um evento que se
 * refere a uma cobrança de um centavo não pode abrir um contato de R$ 19,90. O
 * payload do webhook não é assinado — só o token compartilhado o separa de uma
 * falsificação — então quem responde é a API autenticada do Asaas.
 */
async function verifyPayment(params: {
  chargeId: string;
  expected: number;
  assertedByEvent?: { value: number | null };
}): Promise<{ status: "ok" } | { status: "no"; outcome: SettlementOutcome }> {
  const { chargeId, expected, assertedByEvent } = params;

  let paid: number | null = null;

  try {
    const charge = await fetchCharge(chargeId);

    if (!ASAAS_PAID_STATUSES.has(charge.status)) {
      return {
        status: "no",
        outcome: { status: "unpaid", chargeStatus: charge.status },
      };
    }
    paid = Number(charge.value);
  } catch (err) {
    console.error("[settlement] could not read charge back", err);

    // Sem a API e sem evento não sobra evidência nenhuma de pagamento. É o
    // caso da reconciliação, e recusar é a única saída correta: destravar aqui
    // seria destravar porque o usuário pediu.
    if (!assertedByEvent) {
      return { status: "no", outcome: { status: "error", reason: "unreachable" } };
    }
    paid = assertedByEvent.value;
  }

  if (paid == null || !Number.isFinite(paid)) {
    console.error("[settlement] no usable amount for charge", chargeId);
    return { status: "no", outcome: { status: "error", reason: "no-amount" } };
  }

  if (expected > 0 && paid + AMOUNT_TOLERANCE < expected) {
    return { status: "no", outcome: { status: "underpaid", expected, paid } };
  }

  return { status: "ok" };
}

/** As duas partes ganham o contato, então as duas ficam sabendo. */
async function notifyBothParties(admin: SupabaseClient, matchId: string) {
  const { data: parties } = await admin
    .from("matches")
    .select("trips(traveler_id), orders(requester_id)")
    .eq("id", matchId)
    .single();

  const trip = parties?.trips as unknown as { traveler_id: string } | null;
  const order = parties?.orders as unknown as { requester_id: string } | null;

  for (const userId of [trip?.traveler_id, order?.requester_id]) {
    if (!userId) continue;
    await createNotification({
      userId,
      type: "connection_unlocked",
      title: "Contato liberado",
      message: "A taxa de conexão foi paga. O chat e o contato já estão liberados.",
      relatedMatchId: matchId,
      // Não há sessão de usuário aqui — escreve com o cliente service_role.
      client: admin,
    });
  }
}
