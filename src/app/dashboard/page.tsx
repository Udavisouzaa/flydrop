import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { MotionList, MotionListItem } from "@/components/motion";
import type { Trip, Order, Match } from "@/types/database";

const statusLabel: Record<string, string> = {
  active: "Ativa",
  completed: "Concluída",
  cancelled: "Cancelada",
  open: "Aberto",
  matched: "Combinado",
  pending: "Pendente",
  accepted: "Aceito",
  declined: "Recusado",
};

export default async function DashboardPage() {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: trips }, { data: orders }, { data: matches }] =
    await Promise.all([
      supabase
        .from("trips")
        .select("*")
        .eq("traveler_id", user.id)
        .order("departure_date", { ascending: true }),
      supabase
        .from("orders")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("matches")
        .select("*, trips(*), orders(*)")
        .order("created_at", { ascending: false }),
    ]);

  const myTrips = (trips ?? []) as Trip[];
  const myOrders = (orders ?? []) as Order[];
  const myMatchIds = new Set(myTrips.map((t) => t.id));
  const myOrderIds = new Set(myOrders.map((o) => o.id));
  const myMatches = (
    (matches ?? []) as (Match & { trips: Trip; orders: Order })[]
  ).filter((m) => myMatchIds.has(m.trip_id) || myOrderIds.has(m.order_id));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-bold">Meu painel</h1>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minhas viagens</h2>
          <Link href="/trips/new" className="text-sm text-orange-500 hover:underline">
            + Cadastrar viagem
          </Link>
        </div>
        {myTrips.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Você ainda não cadastrou nenhuma viagem.
          </p>
        ) : (
          <MotionList className="mt-3 divide-y divide-black/10 dark:divide-white/10">
            {myTrips.map((t) => (
              <MotionListItem key={t.id} className="py-3">
                <Link href={`/trips/${t.id}`} className="hover:text-orange-500">
                  {t.origin_city} → {t.destination_city} ·{" "}
                  {new Date(t.departure_date).toLocaleDateString("pt-BR")}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  {statusLabel[t.status]}
                </span>
              </MotionListItem>
            ))}
          </MotionList>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meus pedidos</h2>
          <Link href="/orders/new" className="text-sm text-orange-500 hover:underline">
            + Cadastrar pedido
          </Link>
        </div>
        {myOrders.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Você ainda não cadastrou nenhum pedido.
          </p>
        ) : (
          <MotionList className="mt-3 divide-y divide-black/10 dark:divide-white/10">
            {myOrders.map((o) => (
              <MotionListItem key={o.id} className="py-3">
                <Link href={`/orders/${o.id}`} className="hover:text-orange-500">
                  {o.title} · {o.origin_city} → {o.destination_city}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  {statusLabel[o.status]}
                </span>
              </MotionListItem>
            ))}
          </MotionList>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Meus matches</h2>
        {myMatches.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nenhum match ainda.</p>
        ) : (
          <MotionList className="mt-3 divide-y divide-black/10 dark:divide-white/10">
            {myMatches.map((m) => (
              <MotionListItem key={m.id} className="py-3">
                <Link href={`/matches/${m.id}`} className="hover:text-orange-500">
                  {m.orders.title} · {m.trips.origin_city} →{" "}
                  {m.trips.destination_city}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  {statusLabel[m.status]}
                </span>
              </MotionListItem>
            ))}
          </MotionList>
        )}
      </section>
    </div>
  );
}
