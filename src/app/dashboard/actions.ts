"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Where a notification points.
 *
 * Derived here from the row's own foreign keys rather than accepted from the
 * form: a hidden input carrying a destination is a hidden input an attacker can
 * rewrite, and this one feeds a redirect.
 */
function destinationFor(n: {
  related_match_id: string | null;
  related_order_id: string | null;
  related_trip_id: string | null;
}): string {
  if (n.related_match_id) return `/matches/${n.related_match_id}`;
  if (n.related_order_id) return `/orders/${n.related_order_id}`;
  if (n.related_trip_id) return `/trips/${n.related_trip_id}`;
  return "/dashboard";
}

/**
 * Opens a notification: marks it read, then sends the user where it points.
 *
 * The badge on the dashboard bell counts unread rows. Nothing in the app ever
 * called `markNotificationRead`, so that count only ever went up — a user who
 * received five notifications carried a "5" forever, which trains people to
 * ignore the badge entirely.
 */
export async function openNotification(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("notification_id") ?? "");
  if (!id) redirect("/dashboard");

  // `.eq("user_id", user.id)` is the authorization, not the RLS policy behind
  // it. Reading the row first also gives us the destination.
  const { data: notification } = await supabase
    .from("notifications")
    .select("id, related_match_id, related_order_id, related_trip_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notification) redirect("/dashboard");

  // Only `read` is written. The UPDATE policy on this table has no WITH CHECK,
  // so a broader update statement here could move a row to another user.
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notification.id)
    .eq("user_id", user.id);

  if (error) {
    // Not fatal — the user still gets taken where they were going.
    console.error("[openNotification] mark read failed", error.message);
  }

  redirect(destinationFor(notification));
}

/** Clears the badge in one tap. */
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("[markAllNotificationsRead] failed", error.message);
  }

  revalidatePath("/dashboard");
}
