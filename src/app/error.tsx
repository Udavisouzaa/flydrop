"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-5 text-center">
      <div className="glass w-full rounded-3xl p-8">
        <span className="glass-weak text-destructive mx-auto flex size-14 items-center justify-center rounded-full">
          <AlertTriangle aria-hidden className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Algo deu errado</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tente de novo. Se continuar, chame a gente no WhatsApp.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-brand hover:bg-brand-strong mt-6 w-full rounded-2xl py-3 text-sm font-bold text-brand-foreground"
        >
          Tentar de novo
        </button>
        <a
          href="https://wa.me/5548992084726"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-btn mt-2 block rounded-2xl py-3 text-sm font-semibold"
        >
          Falar com o suporte
        </a>
      </div>
    </div>
  );
}
