import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { expressInterest } from "@/app/matches/actions";
import type { Order, Profile, Trip } from "@/types/database";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { user } = await getCurrentUserWithProfile();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();
  const o = order as Order;

  const { data: requester } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", o.requester_id)
    .single();
  const requesterProfile = requester as Profile | null;

  const isOwner = user?.id === o.requester_id;

  let myActiveTrips: Trip[] = [];
  if (user && !isOwner) {
    const { data } = await supabase
      .from("trips")
      .select("*")
      .eq("traveler_id", user.id)
      .eq("status", "active");
    myActiveTrips = (data ?? []) as Trip[];
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">{o.title}</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {o.origin_city} → {o.destination_city}
        {o.needed_by_date
          ? ` · até ${new Date(o.needed_by_date).toLocaleDateString("pt-BR")}`
          : ""}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Solicitante: {requesterProfile?.full_name ?? "Usuário Flydrop"}
      </p>
      {o.product_link && (
        <p className="mt-2 text-sm">
          Link:{" "}
          <a
            href={o.product_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            {o.product_link}
          </a>
        </p>
      )}
      {o.description && <p className="mt-4 text-sm">{o.description}</p>}
      {o.budget && (
        <p className="mt-2 text-sm text-neutral-500">
          Orçamento para o transporte: R$ {o.budget}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {!user && (
        <p className="mt-8 text-sm text-neutral-500">
          <Link href="/login" className="text-orange-500 hover:underline">
            Entre
          </Link>{" "}
          para oferecer espaço na sua mala para esse pedido.
        </p>
      )}

      {user && !isOwner && (
        <div className="mt-8 rounded-2xl border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-semibold">Posso levar esse pedido</h2>
          {myActiveTrips.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              Você precisa ter uma viagem ativa para essa rota.{" "}
              <Link href="/trips/new" className="text-orange-500 hover:underline">
                Cadastrar viagem
              </Link>
            </p>
          ) : (
            <form action={expressInterest} className="mt-4 space-y-4">
              <input type="hidden" name="order_id" value={o.id} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Qual viagem sua combina com esse pedido?
                </span>
                <select
                  name="trip_id"
                  required
                  className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
                >
                  {myActiveTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.origin_city} → {t.destination_city} (
                      {new Date(t.departure_date).toLocaleDateString("pt-BR")})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
              >
                Ofereço minha viagem
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
