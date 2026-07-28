"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/**
 * O tema morava só no header da landing. Com a landing fora do app, o controle
 * precisa viver aqui — senão quem entra no escuro não tem como sair dele.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const escuro = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={escuro}
      className="flex w-full items-center gap-3 px-4 py-4 text-left"
    >
      {escuro ? (
        <Moon aria-hidden className="text-brand-ink size-5 shrink-0" />
      ) : (
        <Sun aria-hidden className="text-brand-ink size-5 shrink-0" />
      )}
      <span className="flex-1">
        <span className="block text-sm font-semibold">Aparência</span>
        <span className="text-muted-foreground block text-xs">
          {escuro ? "Modo escuro" : "Modo claro"}
        </span>
      </span>
      <span
        aria-hidden
        className={`glass-weak relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          escuro ? "bg-brand/70" : ""
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
            escuro ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
