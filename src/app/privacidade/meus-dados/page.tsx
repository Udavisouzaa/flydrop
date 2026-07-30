import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { DPO_EMAIL } from "@/lib/legal";
import { deleteAccount } from "./actions";

export const metadata: Metadata = {
  title: "Meus dados — Malotex",
  description: "Baixe uma cópia dos seus dados ou exclua sua conta.",
  // Nothing here should ever be indexed or previewed.
  robots: { index: false, follow: false },
};

/**
 * The self-service half of LGPD Art. 18.
 *
 * The rights that can be exercised without a human in the loop are exercised
 * here, immediately: access/portability (the export) and elimination (the
 * delete). Everything else routes to the DPO, because it needs judgement.
 *
 * A page like this is the difference between a policy that grants rights and a
 * product that delivers them.
 */
export default async function MeusDadosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/privacidade/meus-dados");

  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-28">
      <Link
        href="/profile"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Voltar
      </Link>

      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Meus dados</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Seus direitos como titular, do jeito que dá para exercer sozinho: sem
        formulário, sem espera, sem falar com ninguém.
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------------ */}
      <section className="glass mt-5 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Download aria-hidden className="text-brand-ink size-4.5" />
          Baixar meus dados
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Um arquivo JSON com tudo o que temos sobre você: perfil, viagens,
          pedidos, matches, mensagens que você enviou, avaliações, notificações e
          taxas de conexão pagas.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Mensagens que <strong className="text-foreground">outras pessoas</strong>{" "}
          escreveram para você não entram — o conteúdo é delas, não seu.
        </p>

        {/*
          A plain link, not a form: the export is a GET that produces a
          download, so it has to be something the browser can hand to the
          download manager. `download` is a hint; the real filename comes from
          the Content-Disposition header the route sets.
        */}
        <a
          href="/api/privacidade/exportar"
          download
          className="glass-btn text-brand-ink mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
        >
          <Download aria-hidden className="size-4" />
          Baixar cópia dos meus dados
        </a>
        <p className="text-muted-foreground mt-3 text-xs">
          Limite de 3 downloads por hora.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="glass mt-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <ShieldCheck aria-hidden className="text-brand-ink size-4.5" />
          Corrigir ou restringir
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Nome, telefone e bio você edita direto no{" "}
          <Link href="/profile" className="text-brand-ink font-semibold hover:underline">
            seu perfil
          </Link>
          .
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Para anonimização, bloqueio, oposição a um tratamento ou qualquer
          pedido que não esteja nesta página, escreva para{" "}
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="text-brand-ink font-semibold hover:underline"
          >
            {DPO_EMAIL}
          </a>
          . Respondemos em até 15 dias.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mt-4 rounded-3xl border border-red-200 bg-red-50/70 p-6 dark:border-red-900/60 dark:bg-red-950/30">
        <h2 className="flex items-center gap-2 text-base font-bold text-red-700 dark:text-red-300">
          <TriangleAlert aria-hidden className="size-4.5" />
          Excluir minha conta
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-red-700/90 dark:text-red-200/90">
          Isso apaga sua conta e tudo ligado a ela: perfil, viagens, pedidos,
          matches, mensagens e avaliações.{" "}
          <strong>Não dá para desfazer</strong> e não há período de carência.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-red-700/90 dark:text-red-200/90">
          Baixe seus dados antes, se quiser guardar uma cópia. Taxas de conexão
          já pagas não são reembolsadas pela exclusão.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-red-700/90 dark:text-red-200/90">
          Se você tiver uma entrega em andamento, conclua ou recuse o match
          primeiro — a outra pessoa pagou para falar com você.
        </p>

        <form action={deleteAccount} className="mt-5">
          <label className="block">
            <span className="block text-sm font-semibold text-red-700 dark:text-red-300">
              Digite EXCLUIR para confirmar
            </span>
            <input
              name="confirmacao"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="EXCLUIR"
              className="mt-2 w-full rounded-xl border border-red-300 bg-white/70 px-3.5 py-3 text-base outline-none focus:border-red-500 dark:border-red-900 dark:bg-black/30"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-2xl bg-red-600 py-3.5 text-base font-semibold text-white transition-transform hover:bg-red-700 active:scale-[0.99]"
          >
            Excluir conta permanentemente
          </button>
        </form>
      </section>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        Leia a{" "}
        <Link href="/privacidade" className="text-brand-ink font-semibold hover:underline">
          Política de Privacidade
        </Link>{" "}
        e os{" "}
        <Link href="/termos" className="text-brand-ink font-semibold hover:underline">
          Termos de Uso
        </Link>
        .
      </p>
    </div>
  );
}
