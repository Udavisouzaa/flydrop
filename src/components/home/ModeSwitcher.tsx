"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Search, Package, Send } from "lucide-react";
import { AIRPORTS, airportLabel } from "@/lib/airports";

type Mode = "enviar" | "levar";

/**
 * Atalhos de categoria: só pré-preenchem o título do pedido, porque `orders`
 * ainda não tem uma coluna de categoria consultável (ver validations/order.ts,
 * onde `category` existe no schema Zod mas não no formulário).
 */
const CATEGORIES = [
  "Eletrônicos",
  "Documentos",
  "Roupas",
  "Remédios",
  "Cosméticos",
  "Outros",
];

export default function ModeSwitcher() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("enviar");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const enviar = mode === "enviar";

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function routeParams(base?: Record<string, string>) {
    const params = new URLSearchParams(base);
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);
    return params;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Não existe mais vitrine pública de viajantes: o encontro acontece via
    // proposta do viajante sobre um pedido. Então quem envia é levado a
    // publicar o pedido da rota, e quem leva vai para a lista de pedidos.
    if (enviar) {
      const params = new URLSearchParams();
      if (origin) params.set("origin_airport", origin);
      if (destination) params.set("destination_airport", destination);
      const q = params.toString();
      router.push(`/orders/new${q ? `?${q}` : ""}`);
      return;
    }
    const q = routeParams().toString();
    router.push(`/trips${q ? `?${q}` : ""}`);
  }

  function openCategory(label: string) {
    const params = new URLSearchParams({ title: label });
    if (origin) params.set("origin_airport", origin);
    if (destination) params.set("destination_airport", destination);
    router.push(`/orders/new?${params.toString()}`);
  }

  return (
    <section
      className={`glass text-foreground rounded-3xl p-5 transition-colors ${
        enviar ? "glass-brand" : "glass-neon"
      }`}
    >
      {/* Alternador de modo. Um radiogroup de verdade para leitores de tela. */}
      <div
        role="radiogroup"
        aria-label="O que você quer fazer"
        className="glass-weak flex gap-1 rounded-full p-1"
      >
        {(["enviar", "levar"] as const).map((m) => {
          const selected = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? "glass-strong text-foreground"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {m === "enviar" ? "Quero enviar" : "Quero levar"}
            </button>
          );
        })}
      </div>

      <h1 className="mt-5 text-2xl leading-tight font-black tracking-tight">
        {enviar
          ? "Peça de qualquer lugar, receba com quem já vai."
          : "Viaje com a mala cheia e volte com o bolso cheio."}
      </h1>
      <p className="mt-2 text-sm/relaxed opacity-80">
        {enviar
          ? "Diga de onde vem e para onde vai. A gente te mostra quem já está nessa rota."
          : "Informe sua rota e veja quem precisa de algo no mesmo caminho."}
      </p>

      <form onSubmit={submit} className="mt-5">
        <div className="glass-weak text-foreground relative rounded-2xl p-2">
          <AirportSelect
            legend="Saindo de"
            placeholder="Escolha o aeroporto de origem"
            value={origin}
            onChange={setOrigin}
          />

          <div className="border-border border-t" />

          <AirportSelect
            legend="Indo para"
            placeholder="Escolha o aeroporto de destino"
            value={destination}
            onChange={setDestination}
          />

          {/* Botão de inverter, ancorado na divisória entre os dois campos. */}
          <button
            type="button"
            onClick={swap}
            aria-label="Inverter origem e destino"
            className="glass-strong absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <ArrowUpDown aria-hidden className="size-4" />
          </button>
        </div>

        <button
          type="submit"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-4 text-base font-bold text-white transition-transform active:scale-[0.99] dark:bg-white dark:text-black"
        >
          <Search aria-hidden className="size-5" />
          {enviar ? "Publicar meu pedido" : "Ver pedidos nessa rota"}
        </button>
      </form>

      <div className="mt-5">
        <h2 className="text-xs font-semibold tracking-wide uppercase opacity-70">
          Atalhos por categoria
        </h2>
        <ul className="-mx-5 mt-2 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => (
            <li key={c} className="snap-start">
              <button
                type="button"
                onClick={() => openCategory(c)}
                className="glass-weak text-foreground rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap"
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <ShortcutLink
          href="/orders/new"
          icon={<Package aria-hidden className="size-4" />}
          label="Criar pedido"
        />
        <ShortcutLink
          href="/trips/new"
          icon={<Send aria-hidden className="size-4" />}
          label="Cadastrar viagem"
        />
      </div>
    </section>
  );
}

function AirportSelect({
  legend,
  placeholder,
  value,
  onChange,
}: {
  legend: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground px-3 text-[11px] font-medium tracking-wide uppercase">
        {legend}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent px-3 pt-0.5 pr-16 pb-2 text-base font-medium outline-none"
      >
        <option value="">{placeholder}</option>
        {AIRPORTS.map((a) => (
          <option key={a.code} value={a.code}>
            {airportLabel(a.code)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ShortcutLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="glass-weak flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
    >
      {icon}
      {label}
    </Link>
  );
}
