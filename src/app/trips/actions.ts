"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createTripSchema } from "@/lib/validations/trip";
import { getAirport } from "@/lib/airports";
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
    origin_airport: formData.get("origin_airport"),
    destination_airport: formData.get("destination_airport"),
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
  const origin = getAirport(v.origin_airport);
  const destination = getAirport(v.destination_airport);
  if (!origin || !destination) {
    redirect(
      `/trips/new?error=${encodeURIComponent("Selecione um aeroporto da lista.")}`
    );
  }

  // `origin_city` ainda é NOT NULL: a 0014 acrescenta a coluna de aeroporto
  // sem derrubar a de cidade, para que esta versão do código possa subir antes
  // ou depois da migration. A cidade agora é derivada do aeroporto escolhido,
  // então as grafias divergentes que motivaram o cities.ts param de nascer.
  const { data, error } = await supabase
    .from("trips")
    .insert({
      traveler_id: user.id,
      origin_airport: v.origin_airport,
      destination_airport: v.destination_airport,
      origin_city: origin.city,
      origin_state: origin.state,
      destination_city: destination.city,
      destination_state: destination.state,
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
