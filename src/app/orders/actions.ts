"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title"));
  const description = String(formData.get("description") || "") || null;
  const size = String(formData.get("size") || "") || null;
  const weight_kg = formData.get("weight_kg")
    ? Number(formData.get("weight_kg"))
    : null;
  const origin_city = String(formData.get("origin_city"));
  const destination_city = String(formData.get("destination_city"));
  const needed_by_date = String(formData.get("needed_by_date") || "") || null;
  const no_minimum_budget = formData.get("no_minimum_budget") === "true";
  const budget = no_minimum_budget ? null : (formData.get("budget") ? Number(formData.get("budget")) : null);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      requester_id: user.id,
      title,
      description,
      size,
      weight_kg,
      origin_city,
      destination_city,
      needed_by_date,
      budget,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/orders/new?error=${encodeURIComponent(error?.message ?? "Erro ao criar pedido")}`);
  }

  redirect(`/orders/${data.id}`);
}
