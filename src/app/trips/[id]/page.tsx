import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { expressInterest } from "@/app/matches/actions";
import type { Trip, Profile, Order } from "@/types/database";

export default async function TripDetailPage({
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

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();

  if (!trip) notFound();
  const t = trip as Trip;

  const { data: traveler } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", t.traveler_id)
    .single();
  const travelerProfile = traveler as Profile | null;

  const isOwner = user?.id === t.traveler_id;

  let myOpenOrders: Order[] = [];
  if (user && !isOwner) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("requester_id", user.id)
      .eq("status", "open");
    myOpenOrders = (data ?? []) as Order[];
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">
        {t.origin_city}
        {t.origin_state ? `/${t.origin_state}` : ""} → {t.destination_city}
        {t.destination_state ? `/${t.destination_state}` : ""}
      </h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Partida em {new Date(t.departure_date).toLocaleDateString("pt-BR")}
        {t.available_space_kg ? ` · até ${t.available_space_kg}kg disponíveis` : ""}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Viajante: {travelerProfile?.full_name ?? "Usuário Flydrop"}
      </p>
      {t.notes && <p className="mt-4 text-sm">{t.notes}</p>}

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
          para demonstrar interesse nessa viagem.
        </p>
      )}

      {user && !isOwner && (
        <div className="mt-8 rounded-2xl border border-black/10 p-6 dark:border-white/10">
          <h2 className="font-semibold">Tenho interesse nessa viagem</h2>
          {myOpenOrders.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              Você precisa ter um pedido em aberto para propor um match.{" "}
              <Link href="/orders/new" className="text-orange-500 hover:underline">
                Cadastrar pedido
              </Link>
            </p>
          ) : (
            <form action={expressInterest} className="mt-4 space-y-4">
              <input type="hidden" name="trip_id" value={t.id} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Qual pedido seu combina com essa rota?
                </span>
                <select
                  name="order_id"
                  required
                  className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
                >
                  {myOpenOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.origin_city} → {o.destination_city})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
              >
                Tenho interesse
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
