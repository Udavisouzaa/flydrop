import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import type Stripe from "stripe";

/**
 * Stripe webhook endpoint.
 *
 * STATUS: SCAFFOLDING — requires STRIPE_WEBHOOK_SECRET (from `stripe listen`
 * locally or the Dashboard's webhook config in production) and
 * SUPABASE_SERVICE_ROLE_KEY. Neither is set yet.
 *
 * Register this URL (`/api/webhooks/stripe`) in the Stripe Dashboard (or
 * `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local
 * dev) subscribed to:
 *   - account.updated            (Connect onboarding status changes)
 *   - payment_intent.succeeded   (requester's charge cleared)
 *   - payment_intent.payment_failed
 *   - transfer.created           (escrow released to traveler)
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook não configurado neste ambiente" },
      { status: 501 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error("Stripe webhook: admin client unavailable:", err);
    // Ack the event anyway so Stripe doesn't retry forever while we're
    // mid-setup; the DB write is best-effort here.
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const status = account.charges_enabled && account.payouts_enabled
        ? "active"
        : account.requirements?.disabled_reason
        ? "restricted"
        : "pending";

      await supabase
        .from("payment_accounts")
        .update({ stripe_connect_status: status })
        .eq("stripe_account_id", account.id);
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("payments")
        .update({ status: "pending", paid_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", intent.id);
      // Funds are now captured on the platform account and held until
      // releasePayment() (called from matches/actions.ts confirmDropoff)
      // creates the Transfer to the traveler — status stays "pending"
      // (meaning "escrowed") until that Transfer succeeds.
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }

    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      await supabase
        .from("payments")
        .update({ status: "succeeded", stripe_transfer_id: transfer.id })
        .eq("stripe_transfer_id", transfer.id);
      break;
    }

    default:
      // Unhandled event types are fine to ignore.
      break;
  }

  return NextResponse.json({ received: true });
}
