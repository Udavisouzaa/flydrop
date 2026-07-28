import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Bell, User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { getUnreadNotifications } from "@/lib/utils/notifications";
import ModeSwitcher from "@/components/home/ModeSwitcher";
import { openNotification, markAllNotificationsRead } from "./actions";
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
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: trips }, { data: orders }, { data: matches }, notifications] =
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
      // Fails gracefully (returns []) until migration 0005 creates the
      // notifications table.
      getUnreadNotifications(user.id, 5),
    ]);

  const myTrips = (trips ?? []) as Trip[];
  const myOrders = (orders ?? []) as Order[];
  const myTripIds = new Set(myTrips.map((t) => t.id));
  const myOrderIds = new Set(myOrders.map((o) => o.id));
  const myMatches = (
    (matches ?? []) as (Match & { trips: Trip; orders: Order })[]
  ).filter((m) => myTripIds.has(m.trip_id) || myOrderIds.has(m.order_id));

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-2">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {firstName ? `Olá, ${firstName}` : "Olá"}
          </p>
          <p className="text-xl font-black tracking-tight">
            Lev<span className="text-brand-ink">Aí</span>
          </p>
        </div>
        {/*
          The bell used to be the profile link. Tapping a badge that reads "3"
          and landing on account settings is a small betrayal, and the three
          notifications were already on this page — so the bell now jumps to
          them, and the profile gets its own control.
        */}
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <a
              href="#novidades"
              aria-label={`${notifications.length} novidade${
                notifications.length === 1 ? "" : "s"
              } não lida${notifications.length === 1 ? "" : "s"}`}
              className="glass-strong relative flex size-11 items-center justify-center rounded-full"
            >
              <Bell aria-hidden className="size-5" />
              <span className="bg-accent-neon text-accent-neon-foreground absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                {notifications.length}
              </span>
            </a>
          )}
          <Link
            href="/profile"
            aria-label="Meu perfil"
            className="glass-strong flex size-11 items-center justify-center rounded-full"
          >
            <User aria-hidden className="size-5" />
          </Link>
        </div>
      </header>

      <ModeSwitcher />

      {notifications.length > 0 && (
        <section id="novidades" className="mt-6 scroll-mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-base font-bold">Novidades</h2>
            <form action={markAllNotificationsRead}>
              <button type="submit" className="text-brand-ink text-sm font-semibold">
                Marcar todas como lidas
              </button>
            </form>
          </div>
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-border divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  {/*
                    A form, not a Link: opening a notification has to mark it
                    read on the way through, otherwise the badge never clears.
                  */}
                  <form action={openNotification}>
                    <input type="hidden" name="notification_id" value={n.id} />
                    <button
                      type="submit"
                      className="hover:bg-foreground/[0.04] flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.message && (
                          <span className="text-muted-foreground block truncate text-xs">
                            {n.message}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="text-muted-foreground size-4 shrink-0"
                      />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Section
        title="Minhas viagens"
        action={{ href: "/trips/new", label: "Cadastrar" }}
        empty={
          myTrips.length === 0
            ? "Você ainda não cadastrou nenhuma viagem."
            : undefined
        }
      >
        <ul className="divide-border divide-y">
          {myTrips.slice(0, 3).map((t) => (
            <Row
              key={t.id}
              href={`/trips/${t.id}`}
              title={`${t.origin_city} → ${t.destination_city}`}
              subtitle={new Date(t.departure_date).toLocaleDateString("pt-BR")}
              badge={statusLabel[t.status]}
            />
          ))}
        </ul>
      </Section>

      <Section
        title="Meus pedidos"
        action={{ href: "/orders/new", label: "Criar" }}
        empty={
          myOrders.length === 0
            ? "Você ainda não cadastrou nenhum pedido."
            : undefined
        }
      >
        <ul className="divide-border divide-y">
          {myOrders.slice(0, 3).map((o) => (
            <Row
              key={o.id}
              href={`/orders/${o.id}`}
              title={o.title}
              subtitle={`${o.origin_city} → ${o.destination_city}`}
              badge={statusLabel[o.status]}
            />
          ))}
        </ul>
      </Section>

      <Section
        title="Combinações"
        action={{ href: "/tracking", label: "Ver todas" }}
        empty={myMatches.length === 0 ? "Nenhuma combinação ainda." : undefined}
      >
        <ul className="divide-border divide-y">
          {myMatches.slice(0, 3).map((m) => (
            <Row
              key={m.id}
              href={`/matches/${m.id}`}
              title={m.orders.title}
              subtitle={`${m.trips.origin_city} → ${m.trips.destination_city}`}
              badge={statusLabel[m.status]}
            />
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  empty,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  /** Texto do estado vazio. Se definido, o conteúdo não é renderizado. */
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-base font-bold">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="text-brand-ink text-sm font-semibold"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        {empty ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            {empty}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Row({
  href,
  title,
  subtitle,
  badge,
}: {
  href: string;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {subtitle}
          </span>
        </span>
        {badge && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
            {badge}
          </span>
        )}
        <ChevronRight
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
      </Link>
    </li>
  );
}
