"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createTripSchema } from "@/lib/validations/trip";
import { rateLimit } from "@/lib/rate-limit";

export async function createTrip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/trips/new?error=${encodeURIComponent(
        "Você criou muitas viagens em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  const parsed = createTripSchema.safeParse({
    origin_city: formData.get("origin_city"),
    origin_state: formData.get("origin_state") ?? "",
    destination_city: formData.get("destination_city"),
    destination_state: formData.get("destination_state") ?? "",
    departure_date: formData.get("departure_date"),
    arrival_date: formData.get("arrival_date") ?? "",
    available_space_kg: formData.get("available_space_kg") || undefined,
    notes: formData.get("notes") ?? "",
    allow_fragile: formData.get("allow_fragile") ?? undefined,
    allow_electronics: formData.get("allow_electronics") ?? undefined,
    allow_valuable: formData.get("allow_valuable") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/trips/new?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      traveler_id: user.id,
      origin_city: v.origin_city,
      origin_state: v.origin_state || null,
      destination_city: v.destination_city,
      destination_state: v.destination_state || null,
      departure_date: v.departure_date,
      available_space_kg: v.available_space_kg ?? null,
      notes: v.notes || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Postgres messages name tables, columns and constraints, and this one is
    // rendered straight back onto the page. Log it; show something neutral.
    console.error("[createTrip] insert failed", error);
    redirect(
      `/trips/new?error=${encodeURIComponent("Não foi possível criar a viagem.")}`
    );
  }

  redirect(`/trips/${data.id}`);
}

export async function cancelTrip(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tripId = String(formData.get("trip_id") || "");
  if (!tripId) return;

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/trips/${tripId}?error=${encodeURIComponent(
        "Muitas ações em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  await supabase
    .from("trips")
    .update({ status: "cancelled" })
    .eq("id", tripId)
    .eq("traveler_id", user.id);

  redirect(`/trips/${tripId}`);
}
