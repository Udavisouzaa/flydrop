import "server-only";
import Stripe from "stripe";

/**
 * Stripe Connect client.
 *
 * STATUS: SCAFFOLDING — requires STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 * env vars (not yet set in .env.local) and the `payment_accounts` /
 * `payments` tables (migrations 0001 and 0004, pending approval).
 *
 * Marketplace model: money flows requester -> Flydrop platform (via a
 * PaymentIntent held on the platform account) -> traveler's connected
 * account (via a Transfer), released only after both `traveler_confirmed_pickup`
 * and `requester_confirmed_dropoff` are true (see matches/actions.ts
 * confirmDropoff). This is the "separate charges and transfers" Connect
 * flow, which gives us a manual escrow window between charge and transfer.
 */

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Defina em .env.local para habilitar pagamentos."
    );
  }

  stripeSingleton = new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  return stripeSingleton;
}

/** Platform commission taken from each transaction (mirrors payment_accounts.commission_percentage default). */
export const DEFAULT_COMMISSION_PERCENTAGE = 0.1;

export function splitAmount(totalCents: number, commissionPct = DEFAULT_COMMISSION_PERCENTAGE) {
  const commission = Math.round(totalCents * commissionPct);
  const toTraveler = totalCents - commission;
  return { commission, toTraveler };
}
