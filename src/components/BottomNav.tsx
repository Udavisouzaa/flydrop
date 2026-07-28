"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Send, MapPin, Package, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Prefixos que também acendem esta aba (ex.: /trips/new, /trips/[id]). */
  match: string[];
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Início", icon: Home, match: ["/dashboard"] },
  { href: "/trips", label: "Levar", icon: Send, match: ["/trips"] },
  {
    href: "/tracking",
    label: "Acompanhar",
    icon: MapPin,
    match: ["/tracking", "/matches"],
  },
  { href: "/orders", label: "Pedir", icon: Package, match: ["/orders"] },
  {
    href: "/wallet",
    label: "Carteira",
    icon: CreditCard,
    match: ["/wallet", "/profile"],
  },
];

/** Telas sem barra de abas: landing arquivada e fluxo de autenticação. */
const HIDDEN_ON = ["/", "/landing", "/login", "/signup"];

function isActive(pathname: string, tab: Tab) {
  return tab.match.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <>
      {/*
        Espaçador em fluxo normal. A barra é `fixed`, então sem ele o último
        elemento de cada tela fica escondido atrás dela. Mora aqui e não no
        layout para que as telas sem barra (login, landing) não ganhem um
        vão morto no rodapé.
      */}
      <div aria-hidden className="h-[calc(4.25rem+env(safe-area-inset-bottom))]" />
      <nav
        aria-label="Navegação principal"
        className="glass-strong fixed inset-x-0 bottom-0 z-50 rounded-none border-x-0 border-b-0"
      >
        {/* pb respeita a área segura do iPhone (barra de gestos). */}
        <ul className="mx-auto flex max-w-lg items-stretch pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab);
            const Icon = tab.icon;

            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1.5 transition-colors ${
                    active
                      ? "text-brand-ink"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    aria-hidden
                    className="size-6"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  <span className="text-[11px] leading-none font-medium">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
