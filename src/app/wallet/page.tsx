import Link from "next/link";
import { redirect } from "next/navigation";
import { Info, Receipt, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import type { Trip, Order, Match } from "@/types/database";

type MatchWithSides = Match & { trips: Trip; orders: Order };

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function WalletPage() {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // A única cobrança do LevAí é a taxa de conexão (modelo sem custódia: o
  // pagamento da entrega é acertado direto entre as duas pessoas, fora do app).
  // Por isso a carteira lista taxas pagas, não saldo a receber.
  const { data } = await supabase
    .from("matches")
    .select("*, trips(*), orders(*)")
    .eq("unlocked_by", user.id)
    .not("unlocked_at", "is", null)
    .order("unlocked_at", { ascending: false });

  const unlocked = (data ?? []) as MatchWithSides[];
  const totalFees = unlocked.reduce((sum, m) => sum + (m.connection_fee ?? 0), 0);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <h1 className="text-2xl font-black tracking-tight">Carteira</h1>

      <section className="glass glass-brand text-foreground mt-4 rounded-3xl p-5">
        <p className="text-sm opacity-80">Taxas de conexão pagas</p>
        <p className="mt-1 text-3xl font-black tracking-tight">
          {brl(totalFees)}
        </p>
        <p className="mt-3 text-xs/relaxed opacity-80">
          {unlocked.length === 0
            ? "Você ainda não desbloqueou nenhum contato."
            : `${unlocked.length} contato${
                unlocked.length > 1 ? "s" : ""
              } desbloqueado${unlocked.length > 1 ? "s" : ""}.`}
        </p>
      </section>

      <div className="glass mt-4 flex gap-3 rounded-2xl p-4">
        <Info aria-hidden className="text-brand-ink mt-0.5 size-5 shrink-0" />
        <p className="text-muted-foreground text-sm/relaxed">
          O LevAí só cobra a taxa de conexão. O valor do produto e da entrega
          você combina e paga <strong className="text-foreground">direto</strong>{" "}
          com a outra pessoa — o app não guarda nem repassa esse dinheiro.
        </p>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-base font-bold">Histórico</h2>
        <div className="glass overflow-hidden rounded-2xl">
          {unlocked.length === 0 ? (
            <div className="p-8 text-center">
              <span className="glass-weak text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-full">
                <Receipt aria-hidden className="size-7" />
              </span>
              <h3 className="mt-4 font-bold">Nenhum lançamento</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Suas taxas de conexão aparecem aqui assim que você desbloquear
                o contato de alguém.
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {unlocked.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/matches/${m.id}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {m.orders.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {m.trips.origin_city} → {m.trips.destination_city}
                        {m.unlocked_at &&
                          ` · ${new Date(m.unlocked_at).toLocaleDateString("pt-BR")}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      -{brl(m.connection_fee ?? 0)}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="text-muted-foreground size-4 shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Link
        href="/profile"
        className="glass mt-4 flex items-center gap-3 rounded-2xl px-4 py-4"
      >
        <span className="flex-1 text-sm font-semibold">Meu perfil e conta</span>
        <ChevronRight aria-hidden className="text-muted-foreground size-4" />
      </Link>
    </div>
  );
}
