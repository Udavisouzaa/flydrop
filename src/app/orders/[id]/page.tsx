import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { expressInterest } from "@/app/matches/actions";
import BackLink from "@/components/BackLink";
import type { Order, ProfilePublic, Trip } from "@/types/database";

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
    .from("profiles_public")
    .select("*")
    .eq("id", o.requester_id)
    .single();
  const requesterProfile = requester as ProfilePublic | null;

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
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <BackLink href={isOwner ? "/orders" : "/trips"} label={isOwner ? "Meus pedidos" : "Pedidos"} />

      <section className="glass rounded-3xl p-5">
        <h1 className="text-xl font-black tracking-tight">{o.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {o.origin_city} → {o.destination_city}
          {o.needed_by_date
            ? ` · até ${new Date(o.needed_by_date).toLocaleDateString("pt-BR")}`
            : ""}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Solicitante: {requesterProfile?.full_name ?? "Usuário LevAí"}
        </p>
        {o.description && <p className="mt-4 text-sm/relaxed">{o.description}</p>}
        {o.budget && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Oferta pelo transporte: </span>
            <span className="font-bold">R$ {o.budget}</span>
          </p>
        )}
        {o.product_link && (
          <a
            href={o.product_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-ink mt-3 block truncate text-sm font-semibold hover:underline"
          >
            {o.product_link}
          </a>
        )}
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
          para oferecer espaço na sua mala para esse pedido.
        </div>
      )}

      {user && !isOwner && (
        <div className="glass mt-4 rounded-3xl p-5">
          <h2 className="font-bold">Posso levar esse pedido</h2>
          {myActiveTrips.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Você precisa ter uma viagem ativa para essa rota.{" "}
              <Link
                href="/trips/new"
                className="text-brand-ink font-semibold hover:underline"
              >
                Cadastrar viagem
              </Link>
            </p>
          ) : (
            <form action={expressInterest} className="mt-4">
              <input type="hidden" name="order_id" value={o.id} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Qual viagem sua combina com esse pedido?
                </span>
                <select
                  name="trip_id"
                  required
                  className="glass-weak focus:border-brand-ink w-full rounded-xl px-3.5 py-3 text-base outline-none"
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
                className="bg-brand hover:bg-brand-strong mt-4 w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground transition-transform active:scale-[0.99]"
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
