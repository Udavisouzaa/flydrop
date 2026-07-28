import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, ChevronRight, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import type { Trip, Order, Match, MatchStatus } from "@/types/database";

type MatchWithSides = Match & { trips: Trip; orders: Order };

/**
 * Etapas de uma entrega. Todas vêm de colunas reais de `matches` — não há
 * rastreamento externo, então o progresso é o que as duas partes confirmaram.
 */
const STEPS = [
  { label: "Combinado", at: (m: MatchWithSides) => m.accepted_at },
  { label: "Contato liberado", at: (m: MatchWithSides) => m.unlocked_at },
  {
    label: "Produto retirado",
    at: (m: MatchWithSides) => m.traveler_confirmed_pickup_at,
  },
  {
    label: "Entregue",
    at: (m: MatchWithSides) => m.requester_confirmed_dropoff_at,
  },
] as const;

const ACTIVE_STATUSES = new Set<MatchStatus>(["pending", "accepted"]);

export default async function TrackingPage() {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: trips }, { data: orders }, { data: matches }] =
    await Promise.all([
      supabase.from("trips").select("id").eq("traveler_id", user.id),
      supabase.from("orders").select("id").eq("requester_id", user.id),
      supabase
        .from("matches")
        .select("*, trips(*), orders(*)")
        .order("created_at", { ascending: false }),
    ]);

  // RLS já limita o que volta, mas o filtro abaixo garante que só aparecem
  // combinações em que este usuário é uma das duas pontas.
  const myTripIds = new Set((trips ?? []).map((t) => t.id));
  const myOrderIds = new Set((orders ?? []).map((o) => o.id));
  const mine = ((matches ?? []) as MatchWithSides[]).filter(
    (m) => myTripIds.has(m.trip_id) || myOrderIds.has(m.order_id)
  );

  const active = mine.filter((m) => ACTIVE_STATUSES.has(m.status));
  const done = mine.filter((m) => !ACTIVE_STATUSES.has(m.status));

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <h1 className="text-2xl font-black tracking-tight">Acompanhar</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Cada etapa avança quando você ou a outra pessoa confirma no app.
      </p>

      {mine.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {active.length > 0 && (
            <ul className="mt-6 space-y-3">
              {active.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 px-1 text-base font-bold">Encerradas</h2>
              <ul className="space-y-3">
                {done.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithSides }) {
  const reached = STEPS.map((s) => Boolean(s.at(match)));
  const current = reached.lastIndexOf(true);

  return (
    <li className="glass overflow-hidden rounded-3xl">
      <Link href={`/matches/${match.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {match.orders.title}
            </span>
            <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">
                {match.trips.origin_city} → {match.trips.destination_city}
              </span>
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className="text-muted-foreground mt-1 size-4 shrink-0"
          />
        </div>

        {match.status === "declined" ? (
          <p className="text-muted-foreground mt-4 text-xs">
            Esta combinação foi encerrada.
          </p>
        ) : (
          <ol className="mt-4 flex items-start">
            {STEPS.map((step, i) => {
              const isDone = reached[i];
              const isCurrent = i === current + 1;
              return (
                <li key={step.label} className="flex flex-1 flex-col gap-1.5">
                  <div className="flex items-center">
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                        isDone
                          ? "bg-brand text-brand-foreground"
                          : isCurrent
                            ? "border-brand glass-weak border-2"
                            : "glass-weak"
                      }`}
                    >
                      {isDone && <Check aria-hidden className="size-3" />}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className={`h-0.5 flex-1 ${
                          reached[i + 1] ? "bg-brand" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`pr-1 text-[10px] leading-tight ${
                      isDone || isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="glass mt-6 rounded-3xl p-8 text-center">
      <span className="glass-weak text-brand-ink mx-auto flex size-14 items-center justify-center rounded-full">
        <MapPin aria-hidden className="size-7" />
      </span>
      <h2 className="mt-4 font-bold">Nada em andamento</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Quando um pedido seu combinar com uma viagem, o acompanhamento aparece
        aqui.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Link
          href="/orders/new"
          className="bg-brand text-brand-foreground rounded-2xl py-3 text-sm font-bold"
        >
          Criar um pedido
        </Link>
        <Link
          href="/trips"
          className="glass-weak rounded-2xl py-3 text-sm font-semibold"
        >
          Ver pedidos disponíveis
        </Link>
      </div>
    </div>
  );
}
