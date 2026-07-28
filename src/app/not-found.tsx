import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-5 text-center">
      <div className="glass w-full rounded-3xl p-8">
        <span className="glass-weak text-brand-ink mx-auto flex size-14 items-center justify-center rounded-full">
          <Compass aria-hidden className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          O link pode ter expirado ou o item foi removido.
        </p>
        <Link
          href="/dashboard"
          className="bg-brand hover:bg-brand-strong mt-6 block rounded-2xl py-3 text-sm font-bold text-brand-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
