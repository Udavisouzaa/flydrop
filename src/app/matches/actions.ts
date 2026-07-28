"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  expressInterestSchema,
  respondToMatchSchema,
  setAgreedPriceSchema,
} from "@/lib/validations/match";
import { sendMessageSchema } from "@/lib/validations/message";
import { rateLimit } from "@/lib/rate-limit";
import {
  notifyMatchCreated,
  notifyMatchResponded,
  notifyNewMessage,
  createNotification,
} from "@/lib/utils/notifications";

/**
 * Connection-fee pricing (taxa de conexão model, replacing Stripe escrow):
 * a flat/percentage fee charged to unlock contact info between the two
 * parties of a match. Delivery payment itself happens off-platform.
 * Tunable business rule — currently 10% of the order's stated budget,
 * clamped to a sane range, with a flat default when no budget is set.
 */
const CONNECTION_FEE_DEFAULT = 9.9;
const CONNECTION_FEE_MIN = 4.9;
const CONNECTION_FEE_MAX = 29.9;
const CONNECTION_FEE_RATE = 0.1;

function calculateConnectionFee(orderBudget: number | null): number {
  if (!orderBudget || orderBudget <= 0) return CONNECTION_FEE_DEFAULT;
  const raw = orderBudget * CONNECTION_FEE_RATE;
  return Math.round(
    Math.min(CONNECTION_FEE_MAX, Math.max(CONNECTION_FEE_MIN, raw)) * 100
  ) / 100;
}

/**
 * Load a match together with everything the authorization checks need: who the
 * two parties are, who proposed it, what state it is in.
 *
 * These checks are deliberately redundant with the database. Migration 0009
 * puts the same state machine in a BEFORE trigger on `matches`, because RLS
 * alone restricts rows and never columns — so without it any party could PATCH
 * PostgREST directly and skip these actions entirely. The trigger is what makes
 * the rule true; this layer exists so a rejection is a readable message instead
 * of a raw Postgres exception, and so the app never issues a write it already
 * knows is invalid.
 */
async function loadMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
) {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, trip_id, order_id, status, created_by, traveler_confirmed_pickup, requester_confirmed_dropoff, trips(traveler_id, destination_city), orders(requester_id, destination_city)"
    )
    .eq("id", matchId)
    .single();

  if (!data) return null;

  const trip = data.trips as unknown as {
    traveler_id: string;
    destination_city: string;
  } | null;
  const order = data.orders as unknown as {
    requester_id: string;
    destination_city: string;
  } | null;

  if (!trip || !order) return null;

  return {
    travelerId: trip.traveler_id,
    requesterId: order.requester_id,
    destinationCity: order.destination_city ?? trip.destination_city,
    status: data.status as "pending" | "accepted" | "declined" | "completed",
    createdBy: data.created_by as string,
    travelerConfirmedPickup: Boolean(data.traveler_confirmed_pickup),
    requesterConfirmedDropoff: Boolean(data.requester_confirmed_dropoff),
  };
}

type MatchContext = NonNullable<Awaited<ReturnType<typeof loadMatch>>>;

/** The other party, for notification purposes. */
function counterpartOf(match: MatchContext, userId: string) {
  return userId === match.travelerId ? match.requesterId : match.travelerId;
}

export async function expressInterest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = expressInterestSchema.safeParse({
    trip_id: formData.get("trip_id"),
    order_id: formData.get("order_id"),
  });

  if (!parsed.success) {
    redirect(
      `/trips?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Dados inválidos"
      )}`
    );
  }

  const { trip_id, order_id } = parsed.data;

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/trips/${trip_id}?error=${encodeURIComponent(
        "Você enviou muitas propostas em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  const [{ data: trip }, { data: order }] = await Promise.all([
    supabase.from("trips").select("traveler_id, status").eq("id", trip_id).single(),
    supabase
      .from("orders")
      .select("requester_id, status, budget")
      .eq("id", order_id)
      .single(),
  ]);

  // Annotated as `never` so TypeScript narrows after each guard below.
  const fail: (message: string) => never = (message) =>
    redirect(`/trips/${trip_id}?error=${encodeURIComponent(message)}`);

  if (!trip || !order) fail("Viagem ou pedido não encontrado.");

  // Whoever proposes has to own one of the two sides. Without this a user could
  // fabricate a match between two strangers just by knowing the ids.
  if (user.id !== trip.traveler_id && user.id !== order.requester_id) {
    fail("Você não faz parte dessa viagem nem desse pedido.");
  }

  if (trip.traveler_id === order.requester_id) {
    fail("A viagem e o pedido são da mesma pessoa.");
  }

  if (trip.status !== "active") {
    fail("Essa viagem não está mais aceitando propostas.");
  }

  if (order.status === "completed" || order.status === "cancelled") {
    fail("Esse pedido não está mais aberto.");
  }

  // The database recomputes this in the INSERT trigger (migration 0009) — the
  // value sent here is only what the user is shown before the write, and it
  // keeps the insert valid on a database where 0009 has not been applied yet.
  const connectionFee = calculateConnectionFee(
    order.budget != null ? Number(order.budget) : null
  );

  const { data, error } = await supabase
    .from("matches")
    .insert({
      trip_id,
      order_id,
      created_by: user.id,
      connection_fee: connectionFee,
    })
    .select("id")
    .single();

  if (error || !data) {
    // The raw Postgres message can name tables, columns and constraints, and it
    // ends up rendered back on the page. Log it, show something neutral.
    console.error("[expressInterest] insert failed", error);
    fail(
      error?.code === "23505"
        ? "Você já enviou uma proposta para esse pedido."
        : "Não foi possível criar a proposta."
    );
  }

  const match = await loadMatch(supabase, data.id);
  if (match) {
    await notifyMatchCreated({
      recipientId: counterpartOf(match, user.id),
      matchId: data.id,
      destinationCity: match.destinationCity,
    });
  }

  redirect(`/matches/${data.id}`);
}

export async function respondToMatch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Aceitar/recusar notifica a outra parte. Sem teto, é um canal de spam
  // apontado para a caixa de novidades de outra pessoa.
  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    console.warn("[respondToMatch] rate limited", user.id);
    return;
  }

  const parsed = respondToMatchSchema.safeParse({
    match_id: formData.get("match_id"),
    decision: formData.get("decision"),
    declined_reason: formData.get("declined_reason") ?? "",
  });

  if (!parsed.success) return;

  const { match_id, decision, declined_reason } = parsed.data;

  const match = await loadMatch(supabase, match_id);
  if (!match) return;

  // Being a party is necessary but not sufficient. Responding is the act of the
  // side that *received* the proposal — the UI hides the buttons for the
  // proposer (canRespond in ./[id]/page.tsx), but that is only a UI decision.
  if (user.id !== match.travelerId && user.id !== match.requesterId) return;
  if (user.id === match.createdBy) return;

  // Only a pending match can be answered; otherwise an accepted match could be
  // flipped back to declined, or a declined one revived.
  if (match.status !== "pending") return;

  const update: Record<string, unknown> = { status: decision };
  if (decision === "accepted") update.accepted_at = new Date().toISOString();
  if (decision === "declined" && declined_reason)
    update.declined_reason = declined_reason;

  const { error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", match_id)
    .eq("status", "pending"); // guards against two tabs answering at once

  if (error) {
    console.error("[respondToMatch] update failed", error);
    return;
  }

  await notifyMatchResponded({
    recipientId: counterpartOf(match, user.id),
    matchId: match_id,
    accepted: decision === "accepted",
  });

  revalidatePath(`/matches/${match_id}`);
}

export async function setAgreedPrice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    console.warn("[setAgreedPrice] rate limited", user.id);
    return;
  }

  const parsed = setAgreedPriceSchema.safeParse({
    match_id: formData.get("match_id"),
    agreed_price: formData.get("agreed_price"),
  });

  if (!parsed.success) return;

  const match = await loadMatch(supabase, parsed.data.match_id);
  if (!match) return;

  if (user.id !== match.travelerId && user.id !== match.requesterId) return;

  // The agreed price is what the two settle off-platform. Once the match is
  // closed it is a historical record, not a field.
  if (match.status !== "pending" && match.status !== "accepted") return;

  const { error } = await supabase
    .from("matches")
    .update({ agreed_price: parsed.data.agreed_price })
    .eq("id", parsed.data.match_id);

  if (error) {
    console.error("[setAgreedPrice] update failed", error);
    return;
  }

  revalidatePath(`/matches/${parsed.data.match_id}`);
}

/** Traveler confirms they've picked up the item from the requester. */
export async function confirmPickup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    console.warn("[confirmPickup] rate limited", user.id);
    return;
  }

  const matchId = String(formData.get("match_id") || "");
  if (!matchId) return;

  const match = await loadMatch(supabase, matchId);
  if (!match || match.travelerId !== user.id) return; // only the traveler confirms pickup

  // A pickup only means something on a match both sides agreed to, and it
  // cannot be confirmed twice.
  if (match.status !== "accepted") return;
  if (match.travelerConfirmedPickup) return;

  const { error } = await supabase
    .from("matches")
    .update({
      traveler_confirmed_pickup: true,
      traveler_confirmed_pickup_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("traveler_confirmed_pickup", false);

  if (error) {
    console.error("[confirmPickup] update failed", error);
    return;
  }

  await createNotification({
    userId: match.requesterId,
    type: "pickup_confirmed",
    title: "Item coletado pelo viajante",
    message: "O viajante confirmou que pegou seu item. Acompanhe pelo chat.",
    relatedMatchId: matchId,
  });

  revalidatePath(`/matches/${matchId}`);
}

/** Requester confirms they've received the item; may complete the match. */
export async function confirmDropoff(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    console.warn("[confirmDropoff] rate limited", user.id);
    return;
  }

  const matchId = String(formData.get("match_id") || "");
  if (!matchId) return;

  const match = await loadMatch(supabase, matchId);
  if (!match || match.requesterId !== user.id) return; // only the requester confirms dropoff

  if (match.status !== "accepted") return;
  if (match.requesterConfirmedDropoff) return;

  const isComplete = match.travelerConfirmedPickup;

  const { error } = await supabase
    .from("matches")
    .update({
      requester_confirmed_dropoff: true,
      requester_confirmed_dropoff_at: new Date().toISOString(),
      // Sent for pre-0009 databases. Once 0009 is applied the trigger derives
      // 'completed' from the two confirmation flags and ignores this.
      ...(isComplete
        ? { status: "completed", completed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", matchId)
    .eq("requester_confirmed_dropoff", false);

  if (error) {
    console.error("[confirmDropoff] update failed", error);
    return;
  }

  if (isComplete) {
    // Bump completion stats for both parties (best-effort, ignore errors).
    // Migration 0008 moves this to a trigger and makes the RPC idempotent; the
    // call stays until that ships so the counters keep working either way.
    await supabase.rpc("increment_completion_stats", {
      traveler_id: match.travelerId,
      requester_id: match.requesterId,
    });

    // No escrow release here: under the connection-fee model the platform
    // only charges to unlock contact, and the delivery payment itself happens
    // directly between the two parties, off-platform.
    await createNotification({
      userId: match.travelerId,
      type: "match_completed",
      title: "Entrega confirmada!",
      message: "O destinatário confirmou o recebimento. Deixe uma avaliação.",
      relatedMatchId: matchId,
    });
  }

  revalidatePath(`/matches/${matchId}`);
}

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = sendMessageSchema.safeParse({
    match_id: formData.get("match_id"),
    content: formData.get("content"),
  });
  if (!parsed.success) return;

  const { match_id, content } = parsed.data;

  // Each message fans out into a notification row, so an unbounded loop here is
  // a cheap way to flood the other party's inbox.
  const limit = await rateLimit("messageByUser", user.id);
  if (!limit.ok) return;

  const { error } = await supabase
    .from("messages")
    .insert({ match_id, sender_id: user.id, content });

  if (error) {
    // RLS rejects this when the match isn't unlocked yet — expected, not a bug.
    console.error("[sendMessage] insert failed", error);
    return;
  }

  const match = await loadMatch(supabase, match_id);
  if (match) {
    const recipientId = counterpartOf(match, user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await notifyNewMessage({
      recipientId,
      matchId: match_id,
      senderName: profile?.full_name ?? "Alguém",
    });
  }

  revalidatePath(`/matches/${match_id}`);
}
