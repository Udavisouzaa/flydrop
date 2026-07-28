import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { expressInterest } from "@/app/matches/actions";
import BackLink from "@/components/BackLink";
import type { Trip, ProfilePublic, Order } from "@/types/database";

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
    .from("profiles_public")
    .select("*")
    .eq("id", t.traveler_id)
    .single();
  const travelerProfile = traveler as ProfilePublic | null;

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
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <BackLink href="/trips?aba=viagens" label="Viagens" />

      <section className="glass rounded-3xl p-5">
        <h1 className="text-xl font-black tracking-tight">
          {t.origin_city}
          {t.origin_state ? `/${t.origin_state}` : ""} → {t.destination_city}
          {t.destination_state ? `/${t.destination_state}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Partida em {new Date(t.departure_date).toLocaleDateString("pt-BR")}
          {t.available_space_kg
            ? ` · até ${t.available_space_kg}kg disponíveis`
            : ""}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Viajante: {travelerProfile?.full_name ?? "Usuário LevAí"}
        </p>
        {t.notes && <p className="mt-4 text-sm/relaxed">{t.notes}</p>}
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      {!user && (
        <div className="glass mt-4 rounded-3xl p-5 text-sm">
          <Link href="/login" className="text-brand-ink font-semibold hover:underline">
            Entre
          </Link>{" "}
          para demonstrar interesse nessa viagem.
        </div>
      )}

      {user && !isOwner && (
        <div className="glass mt-4 rounded-3xl p-5">
          <h2 className="font-bold">Tenho interesse nessa viagem</h2>
          {myOpenOrders.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Você precisa ter um pedido em aberto para propor um match.{" "}
              <Link
                href="/orders/new"
                className="text-brand-ink font-semibold hover:underline"
              >
                Cadastrar pedido
              </Link>
            </p>
          ) : (
            <form action={expressInterest} className="mt-4">
              <input type="hidden" name="trip_id" value={t.id} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Qual pedido seu combina com essa rota?
                </span>
                <select
                  name="order_id"
                  required
                  className="glass-weak focus:border-brand-ink w-full rounded-xl px-3.5 py-3 text-base outline-none"
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
                className="bg-brand hover:bg-brand-strong mt-4 w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground transition-transform active:scale-[0.99]"
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
