"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getStripe, splitAmount } from "@/lib/stripe";
import {
  initializePaymentSchema,
  stripeOnboardingSchema,
} from "@/lib/validations/payment";
import { createNotification } from "@/lib/utils/notifications";

/**
 * Stripe Connect actions.
 *
 * STATUS: SCAFFOLDING — every action here depends on:
 *  - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET env vars (not yet set)
 *  - `payment_accounts` table (migration 0001, pending approval)
 *  - `payments` table (migration 0004, pending approval)
 * All Supabase reads/writes below fail gracefully (redirect with error,
 * or no-op) until those migrations are applied, mirroring the pattern used
 * in matches/actions.ts and reviews.ts.
 */

/** Resolve the traveler_id/requester_id for a match, same helper pattern as matches/actions.ts. */
async function getMatchParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
) {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, agreed_price, trips(traveler_id), orders(requester_id)"
    )
    .eq("id", matchId)
    .single();

  if (!data) return null;

  const trip = data.trips as unknown as { traveler_id: string } | null;
  const order = data.orders as unknown as { requester_id: string } | null;
  if (!trip || !order) return null;

  return {
    travelerId: trip.traveler_id,
    requesterId: order.requester_id,
    agreedPrice: data.agreed_price as number | null,
  };
}

/**
 * Traveler onboarding: creates (if needed) a Stripe Connect Express account
 * for the traveler and returns an account-link URL for KYC/bank details.
 * Requires `payment_accounts` table (migration 0001).
 */
export async function createStripeOnboardingLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = stripeOnboardingSchema.safeParse({
    return_url: formData.get("return_url"),
    refresh_url: formData.get("refresh_url"),
  });
  if (!parsed.success) {
    redirect(
      `/profile?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Dados inválidos"
      )}`
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    redirect(
      `/profile?error=${encodeURIComponent(
        "Pagamentos ainda não estão configurados neste ambiente"
      )}`
    );
  }

  const { data: existing } = await supabase
    .from("payment_accounts")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let stripeAccountId = existing?.stripe_account_id as string | undefined;

  if (!stripeAccountId) {
    const account = await stripe!.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    stripeAccountId = account.id;

    await supabase.from("payment_accounts").insert({
      user_id: user.id,
      stripe_account_id: stripeAccountId,
      stripe_connect_status: "pending",
    });
  }

  const link = await stripe!.accountLinks.create({
    account: stripeAccountId,
    return_url: parsed.data!.return_url,
    refresh_url: parsed.data!.refresh_url,
    type: "account_onboarding",
  });

  redirect(link.url);
}

/**
 * Requester initializes payment for an accepted match with an agreed price:
 * creates a PaymentIntent held on the platform account (funds captured but
 * not yet transferred to the traveler — the escrow window) and a `payments`
 * row to track it. Requires `payments` table (migration 0004).
 */
export async function initializePayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = initializePaymentSchema.safeParse({
    match_id: formData.get("match_id"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    redirect(
      `/matches/${formData.get("match_id")}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Valor inválido"
      )}`
    );
  }
  const { match_id, amount } = parsed.data!;

  const parties = await getMatchParties(supabase, match_id);
  if (!parties || parties.requesterId !== user.id) {
    redirect(
      `/matches/${match_id}?error=${encodeURIComponent(
        "Apenas o solicitante pode iniciar o pagamento"
      )}`
    );
  }

  const { data: travelerAccount } = await supabase
    .from("payment_accounts")
    .select("stripe_account_id, stripe_connect_status")
    .eq("user_id", parties!.travelerId)
    .maybeSingle();

  if (!travelerAccount || travelerAccount.stripe_connect_status !== "active") {
    redirect(
      `/matches/${match_id}?error=${encodeURIComponent(
        "O viajante ainda não concluiu o cadastro de pagamentos"
      )}`
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    redirect(
      `/matches/${match_id}?error=${encodeURIComponent(
        "Pagamentos ainda não estão configurados neste ambiente"
      )}`
    );
  }

  const amountCents = Math.round(amount * 100);
  const { commission, toTraveler } = splitAmount(amountCents);

  // "Separate charges and transfers": charge lands on the platform account;
  // the Transfer to the traveler's connected account happens later, in
  // releasePayment(), once both pickup and dropoff are confirmed.
  const intent = await stripe!.paymentIntents.create({
    amount: amountCents,
    currency: "brl",
    metadata: { match_id },
    transfer_group: `match_${match_id}`,
  });

  await supabase.from("payments").insert({
    match_id,
    payer_id: user.id,
    payee_id: parties!.travelerId,
    stripe_payment_intent_id: intent.id,
    amount_total: amount,
    amount_to_traveler: toTraveler / 100,
    amount_commission: commission / 100,
    status: "pending",
  });

  revalidatePath(`/matches/${match_id}`);

  // Client secret is not returned here since this is a plain form action;
  // a client component using Stripe Elements would call this via a fetch
  // wrapper and use intent.client_secret to confirm the card payment.
  redirect(`/matches/${match_id}?payment_intent=${intent.id}`);
}

/**
 * Releases escrowed funds to the traveler once a match is fully completed.
 * Called from matches/actions.ts (confirmDropoff) when both
 * traveler_confirmed_pickup and requester_confirmed_dropoff are true —
 * mirrors the increment_completion_stats RPC call in that action.
 * Best-effort: never throws, so it can't block the delivery-confirmation
 * flow if Stripe or the payments table aren't ready yet.
 */
export async function releasePayment(matchId: string) {
  try {
    const supabase = await createClient();
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("match_id", matchId)
      .eq("status", "pending")
      .maybeSingle();

    if (!payment) return;

    const { data: travelerAccount } = await supabase
      .from("payment_accounts")
      .select("stripe_account_id")
      .eq("user_id", payment.payee_id)
      .maybeSingle();

    if (!travelerAccount) return;

    const stripe = getStripe();
    const amountToTravelerCents = Math.round(
      Number(payment.amount_to_traveler) * 100
    );

    const transfer = await stripe.transfers.create({
      amount: amountToTravelerCents,
      currency: "brl",
      destination: travelerAccount.stripe_account_id,
      transfer_group: `match_${matchId}`,
      source_transaction: payment.stripe_payment_intent_id ?? undefined,
    });

    await supabase
      .from("payments")
      .update({
        status: "succeeded",
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    await createNotification({
      userId: payment.payee_id,
      type: "payment_released",
      title: "Pagamento liberado",
      message: "O valor combinado foi transferido para sua conta.",
      relatedMatchId: matchId,
    });
  } catch (err) {
    console.error("releasePayment failed (non-blocking):", err);
  }
}
