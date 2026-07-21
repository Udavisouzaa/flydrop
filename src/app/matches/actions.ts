"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function expressInterest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trip_id = String(formData.get("trip_id"));
  const order_id = String(formData.get("order_id"));

  const { data, error } = await supabase
    .from("matches")
    .insert({ trip_id, order_id, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/trips/${trip_id}?error=${encodeURIComponent(
        error?.message ?? "Não foi possível criar o match"
      )}`
    );
  }

  redirect(`/matches/${data.id}`);
}

export async function respondToMatch(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const match_id = String(formData.get("match_id"));
  const decision = String(formData.get("decision")); // 'accepted' | 'declined'

  await supabase
    .from("matches")
    .update({ status: decision })
    .eq("id", match_id);

  revalidatePath(`/matches/${match_id}`);
}

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const match_id = String(formData.get("match_id"));
  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  await supabase
    .from("messages")
    .insert({ match_id, sender_id: user.id, content });

  revalidatePath(`/matches/${match_id}`);
}
