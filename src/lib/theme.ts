"use client";

import React from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "levai-theme";

/**
 * O tema não vive em estado do React: ele vive na classe `dark` do <html>
 * (ver `@custom-variant dark` em globals.css), escrita pelo script inline do
 * layout antes da primeira pintura. Isso faz do DOM um *external store* no
 * sentido exato do `useSyncExternalStore` — e é por isso que ele, e não
 * `useState` + `useEffect`, é a ferramenta certa aqui.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Lê a fonte da verdade. `classList.contains` é barato o bastante pra rodar a cada render. */
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * No servidor não há <html> pra inspecionar. "light" é só o valor da primeira
 * pintura: o script inline já aplicou a classe certa, então logo após a
 * hidratação o React lê `getSnapshot` e corrige sozinho se preciso.
 */
function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = React.useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    // localStorage lança em modo privado do Safari e quando o site está sem
    // permissão de armazenamento. Sem o try, a exceção subia no meio do
    // onClick e o botão parava de alternar o tema.
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    for (const onChange of listeners) onChange();
  }, []);

  const toggle = React.useCallback(
    () => setTheme(getSnapshot() === "dark" ? "light" : "dark"),
    [setTheme]
  );

  return { theme, setTheme, toggle };
}

/** Executado antes da primeira pintura para não piscar branco em modo escuro. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
