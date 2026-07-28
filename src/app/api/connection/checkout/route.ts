import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  createPixCharge,
  fetchPixQrCode,
  findOrCreateCustomer,
  isAsaasConfigured,
} from "@/lib/asaas";
import { connectionCheckoutSchema } from "@/lib/validations/payment";
import { clientIp, rateLimit } from "@/lib/rate-limit";

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Muitas tentativas. Aguarde um pouco e tente de novo." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * Creates (or reuses) a Pix charge for a match's connection fee.
 *
 * Everything that determines the price or who may pay is read server-side
 * from the DB — the request body carries only a match id. The row in
 * `payments` is written with the service-role client because `payments` has
 * no INSERT policy for end users by design.
 */
export async function POST(request: NextRequest) {
  if (!isAsaasConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não estão configurados neste ambiente" },
      { status: 501 }
    );
  }

  // Checked before authentication so an unauthenticated flood is cheap to
  // reject — it never reaches Supabase.
  const ipLimit = await rateLimit("checkoutByIp", clientIp(request.headers));
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Per-user is the limit that actually bounds spend: each charge that isn't
  // reused is a live Asaas API call and a row in `payments`.
  const userLimit = await rateLimit("checkoutByUser", user.id);
  if (!userLimit.ok) return tooManyRequests(userLimit.retryAfter);

  const parsed = connectionCheckoutSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Match inválido" }, { status: 400 });
  }
  const { match_id } = parsed.data;

  // RLS already restricts matches to their two parties, but resolve the ids
  // explicitly so we never charge someone who isn't part of this match.
  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, status, connection_fee, unlocked_at, trips(traveler_id), orders(requester_id, title)"
    )
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });
  }

  const trip = match.trips as unknown as { traveler_id: string } | null;
  const order = match.orders as unknown as {
    requester_id: string;
    title: string;
  } | null;

  if (!trip || !order) {
    return NextResponse.json({ error: "Match incompleto" }, { status: 409 });
  }
  if (![trip.traveler_id, order.requester_id].includes(user.id)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (match.unlocked_at) {
    return NextResponse.json({ error: "Match já desbloqueado" }, { status: 409 });
  }
  if (match.status !== "accepted") {
    return NextResponse.json(
      { error: "O match precisa ser aceito antes de liberar o contato" },
      { status: 409 }
    );
  }

  const fee = Number(match.connection_fee ?? 0);
  if (!fee || fee <= 0) {
    return NextResponse.json(
      { error: "Taxa de conexão não definida para este match" },
      { status: 409 }
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Pagamentos ainda não estão configurados neste ambiente" },
      { status: 501 }
    );
  }

  // Reuse a still-valid Pix instead of spawning a new charge on every click.
  const { data: reusable } = await admin
    .from("payments")
    .select("psp_charge_id, pix_qr_payload, pix_expires_at")
    .eq("match_id", match_id)
    .eq("kind", "connection_fee")
    .eq("status", "pending")
    .gt("pix_expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reusable?.pix_qr_payload) {
    // A imagem do QR não fica em `payments`, só o copia e cola. Sem buscá-la
    // de novo, o segundo clique devolvia uma cobrança sem `encodedImage` e a
    // tela sumia com o QR sem dizer por quê.
    //
    // Se o Asaas não responder, seguimos com o payload assim mesmo: é ele que
    // efetivamente paga a conta, e o paywall já sabe exibir o copia e cola
    // sozinho. Uma falha aqui não pode derrubar um checkout que já é válido.
    let encodedImage: string | undefined;
    if (reusable.psp_charge_id) {
      try {
        ({ encodedImage } = await fetchPixQrCode(reusable.psp_charge_id));
      } catch (err) {
        console.error("connection checkout: could not refetch Pix QR", err);
      }
    }

    return NextResponse.json({
      payload: reusable.pix_qr_payload,
      encodedImage,
      expiresAt: reusable.pix_expires_at,
      reused: true,
    });
  }

  // Own row — still readable under the owner-only RLS on `profiles`.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  try {
    const customerId = await findOrCreateCustomer({
      userId: user.id,
      name: profile?.full_name ?? "Usuário LevAí",
      email: user.email ?? "",
    });

    const { charge, qr } = await createPixCharge({
      customerId,
      matchId: match_id,
      value: fee,
      description: `LevAí — taxa de conexão (${order.title})`,
    });

    const { error: insertError } = await admin.from("payments").insert({
      match_id,
      payer_id: user.id,
      payee_id: null,
      kind: "connection_fee",
      psp: "asaas",
      psp_charge_id: charge.id,
      pix_qr_payload: qr.payload,
      pix_expires_at: qr.expirationDate,
      amount_total: fee,
      amount_to_traveler: 0,
      amount_commission: fee,
      status: "pending",
    });

    if (insertError) {
      // The charge exists at Asaas but we can't track it — surface the failure
      // instead of showing a QR code we'd never be able to reconcile.
      console.error("connection checkout: payments insert failed", insertError);
      return NextResponse.json(
        { error: "Não foi possível registrar a cobrança" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payload: qr.payload,
      encodedImage: qr.encodedImage,
      expiresAt: qr.expirationDate,
    });
  } catch (err) {
    console.error("connection checkout failed:", err);
    return NextResponse.json(
      { error: "Não foi possível gerar a cobrança Pix" },
      { status: 502 }
    );
  }
}
