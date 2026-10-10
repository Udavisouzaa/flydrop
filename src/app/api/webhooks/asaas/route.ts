import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ASAAS_FAILED_EVENTS,
  ASAAS_PAID_EVENTS,
  verifyWebhookToken,
} from "@/lib/asaas";
import { settleConnectionFee } from "@/lib/connection-settlement";
import { asaasWebhookSchema } from "@/lib/validations/payment";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Asaas webhook — o caminho normal para destravar um match.
 *
 * O banco também impõe isso: o trigger `guard_unlock_fields` recusa qualquer
 * escrita em unlocked_at/unlocked_by que não venha do `service_role`, então
 * nem com um token autenticado em mãos alguém se destrava sozinho.
 *
 * Configurar em Asaas > Integrações > Webhooks apontando para
 * `/api/webhooks/asaas`, com token igual a ASAAS_WEBHOOK_TOKEN.
 *
 * O contrato de reentrega manda em todos os códigos de resposta daqui: o Asaas
 * repete a entrega até receber 2xx. Por isso "não consegui agora" responde 500,
 * para ganhar a repetição, e "isso nunca vai dar certo" responde 200, para não
 * ficar recebendo o mesmo evento até o Asaas desistir sozinho.
 */
export async function POST(request: NextRequest) {
  // The shared token is the only authentication here, so bound how fast it can
  // be guessed. Set well above Asaas's real delivery + retry rate.
  const limit = await rateLimit("webhookByIp", clientIp(request.headers));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas requisições" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  if (!verifyWebhookToken(request.headers.get("asaas-access-token"))) {
    // Deliberately terse: don't tell a prober whether the token or the
    // payload was the problem.
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = asaasWebhookSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const { event, payment } = parsed.data;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("asaas webhook: admin client unavailable", err);
    // 500 so Asaas retries — we don't want to silently drop a real payment.
    return NextResponse.json({ error: "Indisponível" }, { status: 500 });
  }

  if (ASAAS_FAILED_EVENTS.has(event)) {
    const refunded = event === "PAYMENT_REFUNDED";

    const update = admin
      .from("payments")
      .update({
        status: refunded ? "refunded" : "failed",
        ...(refunded ? { refunded_at: new Date().toISOString() } : {}),
      })
      .eq("psp_charge_id", payment.id)
      .eq("kind", "connection_fee");

    // Um estorno se aplica justamente a uma cobrança que foi paga. Já uma
    // reentrega tardia de PAYMENT_OVERDUE não pode rebaixar para "failed" uma
    // cobrança que entrou depois: o evento é velho, o pagamento é o atual.
    const { error } = refunded
      ? await update
      : await update.neq("status", "succeeded");

    if (error) {
      console.error("asaas webhook: failed-event update error", error);
      return NextResponse.json({ error: "Indisponível" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }

  if (!ASAAS_PAID_EVENTS.has(event)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const outcome = await settleConnectionFee({
    admin,
    chargeId: payment.id,
    // A entrega deste evento é o próprio Asaas afirmando o pagamento, então o
    // valor do payload serve de rede se a leitura da cobrança falhar.
    assertedByEvent: { value: payment.value ?? null },
  });

  switch (outcome.status) {
    case "unlocked":
      return NextResponse.json({ received: true });

    case "already":
      // Reentrega, ou o PAYMENT_CONFIRMED e o PAYMENT_RECEIVED chegando juntos.
      return NextResponse.json({ received: true, duplicate: true });

    case "unknown_charge":
      // Cobrança que não é nossa: 200 para o Asaas parar de reentregar.
      return NextResponse.json({ received: true, ignored: true });

    case "underpaid":
      console.error(
        `asaas webhook: underpaid charge ${payment.id} — expected ${outcome.expected}, got ${outcome.paid}`
      );
      // 200: repetir não muda o valor pago.
      return NextResponse.json({ received: true, underpaid: true });

    case "unpaid":
      // O evento diz que recebeu e a API diz que não. Ou é atraso de propagação
      // do lado deles, ou é um evento forjado com o token vazado.
      //
      // 200, mesmo parecendo errado para o primeiro caso. O Asaas pausa a fila
      // inteira de webhooks depois de algumas entregas seguidas sem 2xx, e uma
      // pausa dessas afeta todos os matches, não só este: insistir num evento
      // envenenado trocaria um contato preso por todos eles. O atraso de
      // propagação já tem duas redes — o polling do paywall e o "já paguei" —
      // e as duas releem a cobrança na API, que é a fonte que discorda aqui.
      console.error(
        `asaas webhook: ${event} for charge ${payment.id}, but Asaas reports status ${outcome.chargeStatus}`
      );
      return NextResponse.json({ received: true, inconsistent: true });

    default:
      // Falha nossa. 500 para o Asaas trazer o evento de volta.
      console.error(`asaas webhook: settlement error (${outcome.reason})`);
      return NextResponse.json({ error: "Indisponível" }, { status: 500 });
  }
}
