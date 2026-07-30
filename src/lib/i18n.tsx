"use client";

import React from "react";

export type Lang = "pt" | "en";

/**
 * Traduções da landing pública apenas. O interior do app (pós-login) é
 * pt-BR, porque o produto opera em rotas brasileiras — quem chega em inglês
 * precisa entender a proposta, não operar a entrega.
 */
const DICT = {
  pt: {
    "nav.como": "Como funciona",
    "nav.comunicacao": "Comunicação",
    "nav.paraQuem": "Para quem é",
    "nav.viagens": "Viagens",
    "nav.pedidos": "Pedidos",
    "nav.suporte": "Suporte",
    "nav.menu": "Abrir menu",
    "action.entrar": "Entrar",
    "action.criarConta": "Criar conta",
    "action.jaTenhoConta": "Já tenho conta",
    "action.idioma": "Idioma",
    "action.tema": "Tema",
    "hero.title1": "Sua bagagem",
    "hero.title2": "agora tem valor.",
    "hero.sub":
      "O Malotex conecta quem precisa de um produto de outra cidade com viajantes que têm espaço sobrando na mala.",
    "hero.cta1": "Preciso de um produto",
    "hero.cta2": "Vou viajar, tenho espaço",
    "hero.scroll": "Continue rolando ↓",
    "problema.title": "O problema",
    "problema.compradores": "Compradores",
    "problema.compradoresText":
      "Fretes abusivos — às vezes mais caros que o produto —, restrições geográficas e demora excessiva dos Correios e transportadoras.",
    "problema.viajantes": "Viajantes",
    "problema.viajantesText":
      "Viajam com espaço sobrando na mala e não monetizam esse imóvel vazio.",
    "como.title": "Como funciona",
    "como.s1": "1. Pedido",
    "como.s1d": "Cadastre o item e a rota.",
    "como.s2": "2. Oferta",
    "como.s2d": "Viajantes cadastram a viagem.",
    "como.s3": "3. Match",
    "como.s3d": "A plataforma cruza as rotas.",
    "como.s4": "4. Entrega",
    "como.s4d": "Combinam e entregam com segurança.",
    "com.title1": "Comunicação",
    "com.title2": "Inteligente",
    "com.text":
      "Você nunca fica no escuro. Nossa inteligência artificial monitora os voos em tempo real e atualiza você e o viajante sobre cada etapa.",
    "personas.title": "Para quem é",
    "personas.p1": "O Solicitante",
    "personas.p1d":
      "Precisa enviar documentos urgentes, despachar um item esquecido na viagem ou receber uma encomenda no mesmo dia.",
    "personas.p2": "O Viajante",
    "personas.p2d": "Cede espaço na mala em troca de uma renda extra.",
    "cta.title": "Pronto para começar?",
    "cta.sub": "Cadastre-se gratuitamente e encontre seu match de rota.",
    "cta.button": "Criar minha conta",
    "chat.online": "online",
    "chat.user": "Oi! O viajante já comprou meu iPhone?",
    "chat.bot1": "Tudo certo! ✅",
    "chat.bot2": "O Matheus já está no aeroporto de GRU (Guarulhos).",
    "chat.alert": "📍 Notificação Inteligente",
    "chat.alertText":
      "O voo (LA3390) acabou de pousar. O Matheus chegou em sua cidade (POA) com o seu item!",
    "chat.input": "Mensagem",
    "wa.label": "Falar no WhatsApp",
  },
  en: {
    "nav.como": "How it works",
    "nav.comunicacao": "Updates",
    "nav.paraQuem": "Who it's for",
    "nav.viagens": "Trips",
    "nav.pedidos": "Requests",
    "nav.suporte": "Support",
    "nav.menu": "Open menu",
    "action.entrar": "Sign in",
    "action.criarConta": "Create account",
    "action.jaTenhoConta": "I already have an account",
    "action.idioma": "Language",
    "action.tema": "Theme",
    "hero.title1": "Your luggage",
    "hero.title2": "is now worth money.",
    "hero.sub":
      "Malotex connects people who need a product from another city with travellers who have spare room in their bag.",
    "hero.cta1": "I need a product",
    "hero.cta2": "I'm travelling, I have room",
    "hero.scroll": "Keep scrolling ↓",
    "problema.title": "The problem",
    "problema.compradores": "Buyers",
    "problema.compradoresText":
      "Shipping costs that sometimes exceed the product itself, geographic restrictions and long waits from postal services.",
    "problema.viajantes": "Travellers",
    "problema.viajantesText":
      "They fly with spare room in their luggage and never earn anything from that empty space.",
    "como.title": "How it works",
    "como.s1": "1. Request",
    "como.s1d": "Post the item and the route.",
    "como.s2": "2. Offer",
    "como.s2d": "Travellers post their trip.",
    "como.s3": "3. Match",
    "como.s3d": "The platform crosses the routes.",
    "como.s4": "4. Delivery",
    "como.s4d": "They agree and hand it over safely.",
    "com.title1": "Smart",
    "com.title2": "updates",
    "com.text":
      "You're never left in the dark. Our AI tracks flights in real time and keeps you and the traveller posted on every step.",
    "personas.title": "Who it's for",
    "personas.p1": "The requester",
    "personas.p1d":
      "Needs to send urgent documents, ship an item left behind, or receive a parcel the same day.",
    "personas.p2": "The traveller",
    "personas.p2d": "Gives up bag space in exchange for extra income.",
    "cta.title": "Ready to start?",
    "cta.sub": "Sign up for free and find your route match.",
    "cta.button": "Create my account",
    "chat.online": "online",
    "chat.user": "Hi! Has the traveller bought my iPhone yet?",
    "chat.bot1": "All set! ✅",
    "chat.bot2": "Matheus is already at GRU airport (São Paulo).",
    "chat.alert": "📍 Smart notification",
    "chat.alertText":
      "Flight LA3390 has just landed. Matheus arrived in your city (POA) with your item!",
    "chat.input": "Message",
    "wa.label": "Chat on WhatsApp",
  },
} as const;

export type TKey = keyof (typeof DICT)["pt"];

const LangContext = React.createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
} | null>(null);

const STORAGE_KEY = "levai-lang";

/**
 * A preferência de idioma mora no localStorage, com o idioma do navegador como
 * padrão — as duas coisas só existem no cliente. Como é um estado externo ao
 * React, quem o expõe é `useSyncExternalStore`.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Cache de módulo: `getSnapshot` roda a cada render e não queremos ler o disco toda vez. */
let cached: Lang | null = null;

function readPreference(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    // localStorage bloqueado (modo privado, cookies desativados): cai no navegador.
  }
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function getSnapshot(): Lang {
  if (cached === null) cached = readPreference();
  return cached;
}

/** O servidor não conhece o visitante; pt-BR é o padrão do produto. */
function getServerSnapshot(): Lang {
  return "pt";
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const setLang = React.useCallback((l: Lang) => {
    cached = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    for (const onChange of listeners) onChange();
  }, []);

  const value = React.useMemo(
    () => ({ lang, setLang, t: (k: TKey) => DICT[lang][k] }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = React.useContext(LangContext);
  if (!ctx) throw new Error("useLang precisa estar dentro de <LangProvider>");
  return ctx;
}
