"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createOrderSchema } from "@/lib/validations/order";
import { rateLimit } from "@/lib/rate-limit";

export async function createOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/orders/new?error=${encodeURIComponent(
        "Você criou muitos pedidos em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  const no_minimum_budget = formData.get("no_minimum_budget") === "true";

  const parsed = createOrderSchema.safeParse({
    title: formData.get("title"),
    product_link: formData.get("product_link") ?? "",
    description: formData.get("description") ?? "",
    size: formData.get("size") ?? "",
    weight_kg: formData.get("weight_kg") || undefined,
    origin_city: formData.get("origin_city"),
    destination_city: formData.get("destination_city"),
    needed_by_date: formData.get("needed_by_date") ?? "",
    budget: no_minimum_budget ? undefined : formData.get("budget") || undefined,
    no_minimum_budget,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/orders/new?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      requester_id: user.id,
      title: v.title,
      product_link: v.product_link || null,
      description: v.description || null,
      size: v.size || null,
      weight_kg: v.weight_kg ?? null,
      origin_city: v.origin_city,
      destination_city: v.destination_city,
      needed_by_date: v.needed_by_date || null,
      budget: v.no_minimum_budget ? null : v.budget ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createOrder] insert failed", error);
    redirect(
      `/orders/new?error=${encodeURIComponent("Não foi possível criar o pedido.")}`
    );
  }

  redirect(`/orders/${data.id}`);
}

export async function cancelOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = String(formData.get("order_id") || "");
  if (!orderId) return;

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/orders/${orderId}?error=${encodeURIComponent(
        "Muitas ações em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("requester_id", user.id);

  redirect(`/orders/${orderId}`);
}
