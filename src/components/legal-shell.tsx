import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL_UPDATED_AT } from "@/lib/legal";

/**
 * Frame for /termos and /privacidade.
 *
 * Deliberately plain: these are documents, not product surfaces. The glass
 * panel keeps them inside the design system, but the body is ordinary prose at
 * a comfortable reading measure, because a privacy policy nobody can read is a
 * privacy policy that does not inform — which is the whole point of LGPD
 * Art. 9 (the data subject's right to clear information about the processing).
 */
export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-28">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar
      </Link>

      <div className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{intro}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Última atualização: {LEGAL_UPDATED_AT}
        </p>

        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </div>
  );
}

/** One numbered section of a legal document. */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-baseline gap-2 text-base font-bold">
        <span className="text-brand-ink tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-relaxed [&_a]:text-brand-ink [&_a]:font-semibold [&_a:hover]:underline [&_strong]:text-foreground [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}

/** A bulleted list inside a section, with consistent spacing. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="bg-brand mt-[0.55rem] size-1.5 shrink-0 rounded-full" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
