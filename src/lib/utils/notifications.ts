import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export type NotificationType =
  | "match_suggested"
  | "match_created"
  | "match_accepted"
  | "match_declined"
  | "match_completed"
  | "new_message"
  | "pickup_confirmed"
  | "dropoff_confirmed"
  | "connection_unlocked"
  | "review_received";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  relatedMatchId?: string;
  relatedOrderId?: string;
  relatedTripId?: string;
  /**
   * Optional Supabase client to write with. Webhook handlers have no user
   * session, so RLS would reject the insert from the default cookie-based
   * client — they pass the service-role client instead.
   */
  client?: SupabaseClient;
}

/**
 * Insert a notification row for a user.
 *
 * Fails silently (logged, not thrown) so it never blocks the primary action
 * (e.g. creating a match, confirming a payment) from succeeding.
 */
export async function createNotification(input: CreateNotificationInput) {
  const supabase = input.client ?? (await createClient());

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    related_match_id: input.relatedMatchId ?? null,
    related_order_id: input.relatedOrderId ?? null,
    related_trip_id: input.relatedTripId ?? null,
  });

  if (error) {
    console.error("[notifications] failed to create notification:", error.message);
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  await Promise.all(inputs.map(createNotification));
}

/** Fetch unread notifications for the currently authenticated user. */
export async function getUnreadNotifications(userId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[notifications] failed to fetch:", error.message);
    return [];
  }
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) {
    console.error("[notifications] failed to mark read:", error.message);
  }
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[notifications] failed to mark all read:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Convenience builders for common events, used directly from server actions
// ---------------------------------------------------------------------------

export async function notifyMatchCreated(params: {
  recipientId: string;
  matchId: string;
  destinationCity: string;
}) {
  await createNotification({
    userId: params.recipientId,
    type: "match_created",
    title: "Novo interesse na sua encomenda/viagem",
    message: `Alguém demonstrou interesse em uma entrega para ${params.destinationCity}.`,
    relatedMatchId: params.matchId,
  });
}

export async function notifyMatchResponded(params: {
  recipientId: string;
  matchId: string;
  accepted: boolean;
}) {
  await createNotification({
    userId: params.recipientId,
    type: params.accepted ? "match_accepted" : "match_declined",
    title: params.accepted ? "Seu match foi aceito!" : "Seu match foi recusado",
    message: params.accepted
      ? "Combine os detalhes da entrega pelo chat."
      : "Procure outra viagem ou pedido compatível.",
    relatedMatchId: params.matchId,
  });
}

export async function notifyNewMessage(params: {
  recipientId: string;
  matchId: string;
  senderName: string;
}) {
  await createNotification({
    userId: params.recipientId,
    type: "new_message",
    title: `Nova mensagem de ${params.senderName}`,
    relatedMatchId: params.matchId,
  });
}
