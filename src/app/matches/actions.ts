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

/** Resolve the traveler_id and requester_id for a match, joining trip+order. */
async function getMatchParties(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
) {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, trip_id, order_id, trips(traveler_id, destination_city), orders(requester_id, destination_city)"
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
  };
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

  const { data: order } = await supabase
    .from("orders")
    .select("budget")
    .eq("id", order_id)
    .single();
  const connectionFee = calculateConnectionFee(
    order?.budget != null ? Number(order.budget) : null
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
    redirect(
      `/trips/${trip_id}?error=${encodeURIComponent(
        error?.message ?? "Não foi possível criar o match"
      )}`
    );
  }

  const parties = await getMatchParties(supabase, data.id);
  if (parties) {
    const recipientId =
      user.id === parties.travelerId ? parties.requesterId : parties.travelerId;
    await notifyMatchCreated({
      recipientId,
      matchId: data.id,
      destinationCity: parties.destinationCity,
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

  const parsed = respondToMatchSchema.safeParse({
    match_id: formData.get("match_id"),
    decision: formData.get("decision"),
    declined_reason: formData.get("declined_reason") ?? "",
  });

  if (!parsed.success) return;

  const { match_id, decision, declined_reason } = parsed.data;

  const update: Record<string, unknown> = { status: decision };
  if (decision === "accepted") update.accepted_at = new Date().toISOString();
  if (decision === "declined" && declined_reason)
    update.declined_reason = declined_reason;

  await supabase.from("matches").update(update).eq("id", match_id);

  const parties = await getMatchParties(supabase, match_id);
  if (parties) {
    const recipientId =
      user.id === parties.travelerId ? parties.requesterId : parties.travelerId;
    await notifyMatchResponded({
      recipientId,
      matchId: match_id,
      accepted: decision === "accepted",
    });
  }

  revalidatePath(`/matches/${match_id}`);
}

export async function setAgreedPrice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = setAgreedPriceSchema.safeParse({
    match_id: formData.get("match_id"),
    agreed_price: formData.get("agreed_price"),
  });

  if (!parsed.success) return;

  await supabase
    .from("matches")
    .update({ agreed_price: parsed.data.agreed_price })
    .eq("id", parsed.data.match_id);

  revalidatePath(`/matches/${parsed.data.match_id}`);
}

/** Traveler confirms they've picked up the item from the requester. */
export async function confirmPickup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const matchId = String(formData.get("match_id") || "");
  if (!matchId) return;

  const parties = await getMatchParties(supabase, matchId);
  if (!parties || parties.travelerId !== user.id) return; // only the traveler can confirm pickup

  await supabase
    .from("matches")
    .update({
      traveler_confirmed_pickup: true,
      traveler_confirmed_pickup_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  await createNotification({
    userId: parties.requesterId,
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

  const matchId = String(formData.get("match_id") || "");
  if (!matchId) return;

  const parties = await getMatchParties(supabase, matchId);
  if (!parties || parties.requesterId !== user.id) return; // only the requester can confirm dropoff

  const { data: match } = await supabase
    .from("matches")
    .select("traveler_confirmed_pickup")
    .eq("id", matchId)
    .single();

  const isComplete = Boolean(match?.traveler_confirmed_pickup);

  await supabase
    .from("matches")
    .update({
      requester_confirmed_dropoff: true,
      requester_confirmed_dropoff_at: new Date().toISOString(),
      ...(isComplete
        ? { status: "completed", completed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", matchId);

  if (isComplete) {
    // Bump completion stats for both parties (best-effort, ignore errors)
    await supabase.rpc("increment_completion_stats", {
      traveler_id: parties.travelerId,
      requester_id: parties.requesterId,
    });

    // No escrow release here: under the connection-fee model the platform
    // only charges to unlock contact, and the delivery payment itself happens
    // directly between the two parties, off-platform.
    await createNotification({
      userId: parties.travelerId,
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

  await supabase
    .from("messages")
    .insert({ match_id, sender_id: user.id, content });

  const parties = await getMatchParties(supabase, match_id);
  if (parties) {
    const recipientId =
      user.id === parties.travelerId ? parties.requesterId : parties.travelerId;
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
