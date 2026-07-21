"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createTrip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const origin_city = String(formData.get("origin_city"));
  const origin_state = String(formData.get("origin_state") || "") || null;
  const destination_city = String(formData.get("destination_city"));
  const destination_state =
    String(formData.get("destination_state") || "") || null;
  const departure_date = String(formData.get("departure_date"));
  const available_space_kg = formData.get("available_space_kg")
    ? Number(formData.get("available_space_kg"))
    : null;
  const notes = String(formData.get("notes") || "") || null;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      traveler_id: user.id,
      origin_city,
      origin_state,
      destination_city,
      destination_state,
      departure_date,
      available_space_kg,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/trips/new?error=${encodeURIComponent(error?.message ?? "Erro ao criar viagem")}`);
  }

  redirect(`/trips/${data.id}`);
}
