import Link from "next/link";
import { Plus, Package, Send, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import type { Order, Trip } from "@/types/database";
import { cityMatchesSearch } from "@/lib/utils/cities";

type Aba = "pedidos" | "viagens";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * `orders` não tem coluna de prioridade — o badge "urgente" do design é
 * derivado do prazo, não persistido. Trocar por um campo real exigiria
 * migration, e nenhuma está autorizada a rodar.
 */
const DIAS_PARA_URGENTE = 7;

function ehUrgente(neededBy: string | null) {
  if (!neededBy) return false;
  const dias = (new Date(neededBy).getTime() - Date.now()) / 86_400_000;
  return dias >= 0 && dias <= DIAS_PARA_URGENTE;
}

export default async function LevarPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string; aba?: string }>;
}) {
  const { origin, destination, aba } = await searchParams;
  const abaAtiva: Aba = aba === "viagens" ? "viagens" : "pedidos";

  const supabase = await createClient();
  const { user } = await getCurrentUserWithProfile();

  const [{ data: ordersData }, { data: tripsData }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("trips")
          .select("*")
          .eq("traveler_id", user.id)
          .order("departure_date", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  // Cidades são texto livre, então "floripa" e "Florianópolis" são strings
  // diferentes para o mesmo lugar. O filtro roda depois da canonicalização,
  // não como `ilike` no SQL.
  const pedidos = ((ordersData ?? []) as Order[]).filter(
    (o) =>
      o.requester_id !== user?.id &&
      cityMatchesSearch(o.origin_city, origin) &&
      cityMatchesSearch(o.destination_city, destination)
  );
  const minhasViagens = (tripsData ?? []) as Trip[];

  const qs = new URLSearchParams();
  if (origin) qs.set("origin", origin);
  if (destination) qs.set("destination", destination);
  const filtro = qs.toString();

  function hrefAba(alvo: Aba) {
    const p = new URLSearchParams(filtro);
    if (alvo === "viagens") p.set("aba", "viagens");
    const q = p.toString();
    return q ? `/trips?${q}` : "/trips";
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-2">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Levar</h1>
          <p className="text-muted-foreground text-sm">
            Ganhe na rota que você já vai fazer
          </p>
        </div>
        <Link
          href="/trips/new"
          aria-label="Cadastrar viagem"
          className="bg-brand text-brand-foreground flex size-11 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
        >
          <Plus aria-hidden className="size-5" />
        </Link>
      </header>

      <nav
        aria-label="Seções"
        className="glass-weak flex gap-1 rounded-full p-1"
      >
        <TabLink
          href={hrefAba("pedidos")}
          label={`Pedidos (${pedidos.length})`}
          ativa={abaAtiva === "pedidos"}
        />
        <TabLink
          href={hrefAba("viagens")}
          label={`Minhas viagens (${minhasViagens.length})`}
          ativa={abaAtiva === "viagens"}
        />
      </nav>

      {abaAtiva === "pedidos" ? (
        <>
          <form className="mt-4 grid grid-cols-2 gap-3">
            <Campo
              nome="origin"
              rotulo="Origem"
              valor={origin}
              placeholder="Todas"
            />
            <Campo
              nome="destination"
              rotulo="Destino"
              valor={destination}
              placeholder="Todos"
            />
            <button
              type="submit"
              className="glass-strong col-span-2 rounded-2xl py-3 text-sm font-semibold"
            >
              Filtrar rota
            </button>
          </form>

          <p className="text-muted-foreground mt-4 px-1 text-sm">
            {pedidos.length} pedido(s) disponível(is)
          </p>

          {pedidos.length === 0 ? (
            <Vazio
              icone={<Package aria-hidden className="text-brand-ink size-8" />}
              titulo="Nenhum pedido nessa rota"
              texto="Ajuste o filtro ou volte mais tarde — pedidos novos aparecem aqui."
            />
          ) : (
            <ul className="mt-3 space-y-3">
              {pedidos.map((o) => (
                <CardPedido key={o.id} pedido={o} />
              ))}
            </ul>
          )}
        </>
      ) : minhasViagens.length === 0 ? (
        <Vazio
          icone={<Send aria-hidden className="text-brand-ink size-8" />}
          titulo="Você ainda não cadastrou viagens"
          texto="Cadastre sua rota e receba pedidos de quem precisa de algo no caminho."
          acao={{ href: "/trips/new", label: "Cadastrar viagem" }}
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {minhasViagens.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="glass block rounded-3xl p-4"
              >
                <Rota de={t.origin_city} para={t.destination_city} />
                <p className="text-muted-foreground mt-2 text-xs">
                  Partida em{" "}
                  {new Date(t.departure_date).toLocaleDateString("pt-BR")}
                  {t.available_space_kg
                    ? ` · até ${t.available_space_kg}kg`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabLink({
  href,
  label,
  ativa,
}: {
  href: string;
  label: string;
  ativa: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold transition-colors ${
        ativa
          ? "glass-strong text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function Campo({
  nome,
  rotulo,
  valor,
  placeholder,
}: {
  nome: string;
  rotulo: string;
  valor?: string;
  placeholder: string;
}) {
  return (
    <label className="glass-weak block rounded-2xl px-3 py-2">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {rotulo}
      </span>
      <input
        name={nome}
        defaultValue={valor}
        placeholder={placeholder}
        autoComplete="address-level2"
        className="w-full bg-transparent text-sm font-medium outline-none"
      />
    </label>
  );
}

function CardPedido({ pedido }: { pedido: Order }) {
  const urgente = ehUrgente(pedido.needed_by_date);

  return (
    <li
      className={`glass rounded-3xl p-4 ${urgente ? "glass-neon" : ""}`}
    >
      {urgente && (
        <p className="bg-accent-neon text-accent-neon-foreground mb-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase">
          <Zap aria-hidden className="size-3" />
          Urgente
        </p>
      )}

      <div className="flex gap-3">
        <span
          aria-hidden
          className="glass-weak flex size-14 shrink-0 items-center justify-center rounded-2xl"
        >
          <Package className="text-brand-ink size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base leading-tight font-bold">
              {pedido.title}
            </h3>
            {pedido.budget != null && (
              <span className="shrink-0 text-right">
                <span className="text-muted-foreground block text-[10px] leading-none">
                  Oferta
                </span>
                <span className="text-base font-black">
                  {brl.format(pedido.budget)}
                </span>
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {[
              pedido.size,
              pedido.weight_kg ? `${pedido.weight_kg} kg` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sem detalhes de tamanho"}
          </p>
        </div>
      </div>

      <div className="border-glass-edge mt-3 border-t pt-3">
        <Rota de={pedido.origin_city} para={pedido.destination_city} />
      </div>

      <div className="text-muted-foreground mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-1 font-semibold">
          Buscando viajante
        </span>
        {pedido.needed_by_date && (
          <span>
            até {new Date(pedido.needed_by_date).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>

      {/* A proposta precisa de uma viagem associada; a escolha acontece no
          detalhe do pedido, onde já existe o form da action expressInterest. */}
      <Link
        href={`/orders/${pedido.id}`}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-transform active:scale-[0.99] ${
          urgente
            ? "bg-accent-neon text-accent-neon-foreground"
            : "bg-brand text-brand-foreground"
        }`}
      >
        {urgente && <Zap aria-hidden className="size-4" />}
        Fazer proposta
      </Link>
    </li>
  );
}

function Rota({ de, para }: { de: string; para: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
      <span className="bg-brand size-2 shrink-0 rounded-full" />
      <span className="truncate">{de}</span>
      <span className="text-muted-foreground shrink-0">→</span>
      <span className="bg-accent-neon size-2 shrink-0 rounded-full" />
      <span className="truncate">{para}</span>
    </p>
  );
}

function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
  acao?: { href: string; label: string };
}) {
  return (
    <div className="mt-10 flex flex-col items-center px-6 text-center">
      <span className="glass flex size-20 items-center justify-center rounded-3xl">
        {icone}
      </span>
      <h2 className="mt-5 text-lg font-bold">{titulo}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{texto}</p>
      {acao && (
        <Link
          href={acao.href}
          className="bg-brand text-brand-foreground mt-6 w-full rounded-2xl py-4 text-center text-base font-bold"
        >
          {acao.label}
        </Link>
      )}
    </div>
  );
}
