"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createReviewSchema } from "@/lib/validations/review";
import { createNotification } from "@/lib/utils/notifications";

/**
 * Leave a review for the other party of a completed match.
 * Requires migration 0003 (reviews table + RLS policy that enforces
 * match.status = 'completed' and reviewer/reviewed being the two parties).
 */
export async function createReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = createReviewSchema.safeParse({
    match_id: formData.get("match_id"),
    reviewed_user_id: formData.get("reviewed_user_id"),
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    const matchId = String(formData.get("match_id") || "");
    redirect(
      `/matches/${matchId}?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Avaliação inválida"
      )}`
    );
  }

  const v = parsed.data;

  const { error } = await supabase.from("reviews").insert({
    match_id: v.match_id,
    reviewer_id: user.id,
    reviewed_user_id: v.reviewed_user_id,
    rating: v.rating,
    title: v.title || null,
    comment: v.comment || null,
  });

  if (error) {
    redirect(
      `/matches/${v.match_id}?error=${encodeURIComponent(
        error.message.includes("duplicate")
          ? "Você já avaliou este match"
          : error.message
      )}`
    );
  }

  await createNotification({
    userId: v.reviewed_user_id,
    type: "review_received",
    title: "Você recebeu uma avaliação",
    message: `Nota: ${v.rating}/5`,
    relatedMatchId: v.match_id,
  });

  revalidatePath(`/matches/${v.match_id}`);
  revalidatePath(`/profile`);
}
