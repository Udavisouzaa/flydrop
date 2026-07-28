import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, FileText, LogOut, ShieldCheck } from "lucide-react";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import ThemeToggle from "@/components/ThemeToggle";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const { error, ok } = await searchParams;
  const iniciais = (profile?.full_name ?? user.email ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <h1 className="text-2xl font-black tracking-tight">Meu perfil</h1>

      <section className="glass mt-4 flex items-center gap-4 rounded-3xl p-5">
        <span className="glass-weak text-brand-ink flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-black">
          {iniciais}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold">
            {profile?.full_name ?? "Sem nome"}
          </span>
          <span className="text-muted-foreground block truncate text-sm">
            {user.email}
          </span>
        </span>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}
      {ok && (
        <p className="bg-brand-soft text-brand-ink mt-4 rounded-xl px-4 py-2.5 text-sm">
          Perfil atualizado.
        </p>
      )}

      <form action={updateProfile} className="glass mt-4 rounded-3xl p-5">
        <Field
          label="Nome completo"
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
        />
        <Field
          label="Telefone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={profile?.phone ?? ""}
        />
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Sobre você</span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            className="glass-weak focus:border-brand-ink w-full resize-none rounded-xl px-3.5 py-3 text-base outline-none"
          />
        </label>
        <button
          type="submit"
          className="bg-brand hover:bg-brand-strong mt-5 w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground transition-transform active:scale-[0.99]"
        >
          Salvar
        </button>
      </form>

      <section className="glass mt-4 overflow-hidden rounded-3xl">
        <ThemeToggle />
      </section>

      {/*
        Privacy has to be reachable from inside the product, not only from the
        signup screen nobody revisits. LGPD Art. 18 is a right the user exercises
        while logged in, so the door to it belongs next to the account settings.
      */}
      <section className="glass mt-4 overflow-hidden rounded-3xl">
        <SettingsLink
          href="/privacidade/meus-dados"
          icon={<ShieldCheck aria-hidden className="text-brand-ink size-4.5" />}
          label="Meus dados"
          hint="Baixar cópia ou excluir conta"
        />
        <SettingsLink
          href="/privacidade"
          icon={<FileText aria-hidden className="text-brand-ink size-4.5" />}
          label="Política de Privacidade"
        />
        <SettingsLink
          href="/termos"
          icon={<FileText aria-hidden className="text-brand-ink size-4.5" />}
          label="Termos de Uso"
          last
        />
      </section>

      <form action="/auth/signout" method="post" className="mt-4">
        <button
          type="submit"
          className="glass-btn text-destructive flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold"
        >
          <LogOut aria-hidden className="size-4" />
          Sair da conta
        </button>
      </form>
    </div>
  );
}

/** One row of the settings list. Hairline between rows, none after the last. */
function SettingsLink({
  href,
  icon,
  label,
  hint,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`hover:bg-foreground/[0.04] flex items-center gap-3 px-5 py-4 transition-colors ${
        last ? "" : "border-b border-white/10 dark:border-white/5"
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && (
          <span className="text-muted-foreground block text-xs">{hint}</span>
        )}
      </span>
      <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="glass-weak focus:border-brand-ink w-full rounded-xl px-3.5 py-3 text-base outline-none"
      />
    </label>
  );
}
