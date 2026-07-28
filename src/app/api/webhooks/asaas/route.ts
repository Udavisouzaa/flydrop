import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ASAAS_FAILED_EVENTS,
  ASAAS_PAID_EVENTS,
  fetchCharge,
  verifyWebhookToken,
} from "@/lib/asaas";
import { asaasWebhookSchema } from "@/lib/validations/payment";
import { createNotification } from "@/lib/utils/notifications";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Pix amounts are small and stored as numeric; a cent of float drift shouldn't
 * block a legitimate unlock, but anything larger should.
 */
const AMOUNT_TOLERANCE = 0.01;

/**
 * Asaas webhook — the only path that may set `matches.unlocked_at`.
 *
 * The DB enforces this too: the `guard_unlock_fields` trigger rejects any
 * write to unlocked_at/unlocked_by that doesn't come from `service_role`, so
 * a user can't self-unlock even if they got hold of an authenticated token.
 *
 * Configure in Asaas > Integrações > Webhooks pointing at
 * `/api/webhooks/asaas`, with an access token matching ASAAS_WEBHOOK_TOKEN.
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

  // Resolve the match from our own records rather than trusting the payload's
  // externalReference, which is only a fallback for charges created elsewhere.
  const { data: paymentRow } = await admin
    .from("payments")
    .select("id, match_id, payer_id, status, kind, amount_total")
    .eq("psp_charge_id", payment.id)
    .maybeSingle();

  const matchId = paymentRow?.match_id ?? payment.externalReference ?? null;

  if (!paymentRow || paymentRow.kind !== "connection_fee" || !matchId) {
    // Unknown or non-connection charge: ack so Asaas stops retrying.
    return NextResponse.json({ received: true, ignored: true });
  }

  if (ASAAS_FAILED_EVENTS.has(event)) {
    await admin
      .from("payments")
      .update({
        status: event === "PAYMENT_REFUNDED" ? "refunded" : "failed",
        ...(event === "PAYMENT_REFUNDED"
          ? { refunded_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", paymentRow.id);

    return NextResponse.json({ received: true });
  }

  if (!ASAAS_PAID_EVENTS.has(event)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  // Idempotency: Asaas sends both PAYMENT_CONFIRMED and PAYMENT_RECEIVED for
  // the same charge, and retries on any non-2xx.
  if (paymentRow.status === "succeeded") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Confirm what was actually paid before unlocking anything.
  //
  // Until now this route took "PAYMENT_RECEIVED" at face value and never looked
  // at the amount. The connection fee is the only revenue LevAí has, so an
  // event referring to a charge worth one centavo must not open a R$ 29,90
  // contact. Ask Asaas over the authenticated API instead of trusting the
  // unsigned payload; if that call fails, fall back to the payload value rather
  // than dropping a real payment on the floor.
  const expected = Number(paymentRow.amount_total ?? 0);
  let paidValue: number | null = null;

  try {
    const charge = await fetchCharge(payment.id);
    paidValue = Number(charge.value);
  } catch (err) {
    console.error("asaas webhook: could not read charge back", err);
    paidValue = payment.value != null ? Number(payment.value) : null;
  }

  if (paidValue == null || !Number.isFinite(paidValue)) {
    console.error("asaas webhook: no usable amount for charge", payment.id);
    // 500 so Asaas retries — this is our failure, not a bad event.
    return NextResponse.json({ error: "Indisponível" }, { status: 500 });
  }

  if (expected > 0 && paidValue + AMOUNT_TOLERANCE < expected) {
    console.error(
      `asaas webhook: underpaid charge ${payment.id} — expected ${expected}, got ${paidValue}`
    );
    // 200 so Asaas stops retrying: replaying it won't change the amount.
    return NextResponse.json({ received: true, underpaid: true });
  }

  const now = new Date().toISOString();

  const { error: paymentError } = await admin
    .from("payments")
    .update({ status: "succeeded", paid_at: now })
    .eq("id", paymentRow.id);

  if (paymentError) {
    console.error("asaas webhook: payment update failed", paymentError);
    return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
  }

  const { error: matchError } = await admin
    .from("matches")
    .update({ unlocked_at: now, unlocked_by: paymentRow.payer_id })
    .eq("id", matchId)
    .is("unlocked_at", null);

  if (matchError) {
    console.error("asaas webhook: unlock failed", matchError);
    return NextResponse.json({ error: "Falha ao desbloquear" }, { status: 500 });
  }

  // Both parties get the contact, so both should hear about it.
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
      // No user session in a webhook — write with the service-role client.
      client: admin,
    });
  }

  return NextResponse.json({ received: true });
}
