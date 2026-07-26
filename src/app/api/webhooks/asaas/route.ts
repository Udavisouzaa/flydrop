import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ASAAS_FAILED_EVENTS,
  ASAAS_PAID_EVENTS,
  verifyWebhookToken,
} from "@/lib/asaas";
import { asaasWebhookSchema } from "@/lib/validations/payment";
import { createNotification } from "@/lib/utils/notifications";

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
    .select("id, match_id, payer_id, status, kind")
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
