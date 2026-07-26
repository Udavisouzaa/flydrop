import "server-only";

/**
 * Asaas client (Pix) — connection-fee model.
 *
 * The platform charges a one-off "taxa de conexão" to unlock the other
 * party's contact info on a match. Money never flows between users through
 * Flydrop: the delivery payment itself is settled directly between them,
 * off-platform. That keeps us out of third-party fund custody entirely and
 * avoids the CNPJ requirement that blocks Stripe Connect payouts to PF here.
 *
 * Env vars:
 *   ASAAS_API_KEY       — from Asaas > Integrações > Chave de API
 *   ASAAS_ENV           — "sandbox" (default) or "production"
 *   ASAAS_WEBHOOK_TOKEN — the token configured on the Asaas webhook, sent
 *                         back to us in the `asaas-access-token` header
 */

const ASAAS_BASE_URL = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

export function isAsaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY);
}

function asaasFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ASAAS_API_KEY não configurada. Defina em .env.local para habilitar a taxa de conexão."
    );
  }
  const env = process.env.ASAAS_ENV === "production" ? "production" : "sandbox";

  return fetch(`${ASAAS_BASE_URL[env]}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
  });
}

async function asaasJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await asaasFetch(path, init);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const description =
      (body as { errors?: { description?: string }[] } | null)?.errors?.[0]
        ?.description ?? `Asaas respondeu ${res.status}`;
    throw new Error(description);
  }

  return body as T;
}

interface AsaasCustomer {
  id: string;
}

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  invoiceUrl?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

/**
 * Find or create the Asaas customer for a Flydrop user. Asaas requires a
 * customer on every charge; we key it by our own user id via externalReference
 * so repeat charges reuse the same record.
 */
export async function findOrCreateCustomer(params: {
  userId: string;
  name: string;
  email: string;
  cpfCnpj?: string | null;
}): Promise<string> {
  const existing = await asaasJson<{ data: AsaasCustomer[] }>(
    `/customers?externalReference=${encodeURIComponent(params.userId)}`
  );
  if (existing.data?.[0]?.id) return existing.data[0].id;

  const created = await asaasJson<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      externalReference: params.userId,
      ...(params.cpfCnpj ? { cpfCnpj: params.cpfCnpj } : {}),
    }),
  });
  return created.id;
}

/**
 * Create a Pix charge for the connection fee. `externalReference` carries the
 * match id so the webhook can resolve which match to unlock without trusting
 * anything the client sends.
 */
export async function createPixCharge(params: {
  customerId: string;
  matchId: string;
  value: number;
  description: string;
}): Promise<{ charge: AsaasPayment; qr: AsaasPixQrCode }> {
  // Pix charges expire fast enough that "due today" is the right semantic:
  // the QR code TTL below is what actually gates the user.
  const dueDate = new Date().toISOString().slice(0, 10);

  const charge = await asaasJson<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: "PIX",
      value: params.value,
      dueDate,
      description: params.description,
      externalReference: params.matchId,
    }),
  });

  const qr = await asaasJson<AsaasPixQrCode>(
    `/payments/${charge.id}/pixQrCode`
  );

  return { charge, qr };
}

/**
 * Constant-time-ish comparison of the webhook token. Asaas doesn't sign its
 * payloads (as of v3) — it echoes back a shared token in the
 * `asaas-access-token` header, so that header is the only thing standing
 * between us and a forged "payment confirmed" event.
 */
export function verifyWebhookToken(received: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  if (expected.length !== received.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Asaas events that mean "the money is in". */
export const ASAAS_PAID_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
]);

export const ASAAS_FAILED_EVENTS = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
]);
