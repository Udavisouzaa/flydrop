"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Globe,
  Moon,
  Sun,
  Plane,
  Package,
  Sparkles,
  Users,
  LifeBuoy,
  Menu,
  X,
  Route,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { useLang, type TKey } from "@/lib/i18n";

const WHATSAPP = "https://wa.me/5548992084726";

/**
 * A landing é um scrollytelling de 600vh: cada estágio aparece numa fração do
 * scroll, não numa âncora do DOM. Por isso os itens de navegação que apontam
 * para uma seção levam uma fração de progresso em vez de um `#id` — âncora
 * não funciona em overlay `position: absolute`.
 */
type NavItem = {
  key: TKey;
  icon: React.ComponentType<{ className?: string }>;
} & ({ progress: number } | { href: string; external?: boolean });

const NAV: NavItem[] = [
  { key: "nav.como", icon: Route, progress: 0.49 },
  { key: "nav.comunicacao", icon: Sparkles, progress: 0.71 },
  { key: "nav.paraQuem", icon: Users, progress: 0.91 },
  { key: "nav.viagens", icon: Plane, href: "/trips" },
  { key: "nav.pedidos", icon: Package, href: "/orders/new" },
  { key: "nav.suporte", icon: LifeBuoy, href: WHATSAPP, external: true },
];

function scrollToProgress(p: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: p * max, behavior: "smooth" });
}

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useLang();

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nextLang = lang === "pt" ? "en" : "pt";

  function renderNavItem(item: NavItem, mobile: boolean) {
    const label = t(item.key);
    // Desktop and mobile render the same NAV at the same time while the drawer
    // is open, so the scope prefix keeps each test id resolving to one node.
    const testId = `${mobile ? "mobile" : "header"}-nav-${item.key.slice("nav.".length)}`;
    const className = mobile
      ? "flex items-center gap-3 rounded-xl p-3 font-medium text-black hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
      : "text-sm font-medium text-neutral-500 transition-colors hover:text-black dark:hover:text-white";
    const inner = (
      <>
        {mobile && <item.icon className="size-5 text-neutral-500" />}
        {label}
      </>
    );

    if ("progress" in item) {
      return (
        <button
          key={item.key}
          type="button"
          data-testid={testId}
          className={cn(className, mobile && "w-full text-left")}
          onClick={() => {
            setOpen(false);
            scrollToProgress(item.progress);
          }}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        key={item.key}
        href={item.href}
        data-testid={testId}
        onClick={() => setOpen(false)}
        {...(item.external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  return (
    <header
      data-testid="header"
      className={cn(
        "fixed top-0 z-50 w-full border-b border-transparent transition-all duration-200",
        scrolled && "glass-strong rounded-none border-x-0 border-t-0"
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          data-testid="header-logo"
          className="flex items-center text-2xl font-bold tracking-tighter"
        >
          <span className="text-black dark:text-white">Malo</span>
          <span className="text-brand-ink">tex</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => renderNavItem(item, false))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            onClick={() => setLang(nextLang)}
            size="sm"
            variant="ghost"
            data-testid="header-lang-toggle"
            aria-label={`${t("action.idioma")}: ${lang.toUpperCase()}`}
            title={t("action.idioma")}
          >
            <Globe className="size-4" />
            <span className="text-xs font-semibold" data-testid="header-lang-value">
              {lang.toUpperCase()}
            </span>
          </Button>
          <Button
            aria-label={t("action.tema")}
            title={t("action.tema")}
            onClick={toggle}
            size="icon"
            variant="ghost"
            data-testid="header-theme-toggle"
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
          <Link
            href="/login"
            data-testid="header-login"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-4")}
          >
            {t("action.entrar")}
          </Link>
          <Link
            href="/signup"
            data-testid="header-signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand hover:bg-brand-strong px-5 text-brand-foreground"
            )}
          >
            {t("action.criarConta")}
          </Link>
        </div>

        <Button
          onClick={() => setOpen(!open)}
          size="icon"
          variant="ghost"
          className="md:hidden"
          data-testid="header-menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={t("nav.menu")}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      <MobileMenu open={open}>
        <div className="mt-2 flex w-full flex-col gap-y-1">
          {NAV.map((item) => renderNavItem(item, true))}
        </div>

        <div className="mt-auto mb-8 flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1 gap-2"
              onClick={() => setLang(nextLang)}
              variant="outline"
            >
              <Globe className="size-4" /> {lang.toUpperCase()}
            </Button>
            <Button className="h-11 flex-1 gap-2" onClick={toggle} variant="outline">
              {theme === "light" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
              {t("action.tema")}
            </Button>
          </div>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            data-testid="mobile-signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-brand hover:bg-brand-strong h-12 w-full text-brand-foreground"
            )}
          >
            {t("action.criarConta")}
          </Link>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            data-testid="mobile-login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 w-full"
            )}
          >
            {t("action.jaTenhoConta")}
          </Link>
        </div>
      </MobileMenu>
    </header>
  );
}

function MobileMenu({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();

  if (!hydrated || !open) return null;

  return createPortal(
    <div
      id="mobile-menu"
      data-testid="mobile-menu"
      className="glass-strong fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col overflow-y-auto rounded-none border-x-0 border-b-0 md:hidden"
    >
      <div className="animate-in fade-in zoom-in-95 flex h-full w-full flex-col p-4 duration-200 ease-out">
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Um store que nunca muda: `subscribe` não faz nada, o snapshot do servidor é
 * `false` e o do cliente é `true`. Definidos fora do componente porque
 * `useSyncExternalStore` re-subscreve sempre que a identidade de `subscribe`
 * muda.
 */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * `true` só depois da hidratação.
 *
 * `createPortal` precisa de `document.body`, que não existe no render do
 * servidor — daí o gate. Era um `useState` + `useEffect` que chamava
 * `setMounted(true)`, o que dispara um render em cascata logo após a
 * hidratação; `useSyncExternalStore` expressa a mesma ideia ("me dê um valor
 * no servidor e outro no cliente") sem o setState dentro do efeito.
 */
function useHydrated() {
  return React.useSyncExternalStore(neverChanges, onClient, onServer);
}

function useScroll(threshold: number) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
