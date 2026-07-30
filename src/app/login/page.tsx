import Link from "next/link";
import { login } from "./actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";
import { AuthShell, AuthField } from "@/components/auth-shell";
import { GoogleButton } from "@/components/google-button";

/**
 * Notices this page is willing to show, keyed by a short code.
 *
 * Deliberately a lookup and not free text in the query string: anything the URL
 * can put on a login screen is something an attacker can put on a login screen.
 * `?message=Sua sessão expirou, confirme sua senha` is a convincing phishing
 * page hosted on our own domain, and it costs nothing to make impossible.
 */
const AVISOS: Record<string, string> = {
  confirme: "Confirme seu e-mail para entrar.",
  excluida: "Sua conta foi excluída. Sentiremos sua falta.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; aviso?: string; next?: string }>;
}) {
  const { error, aviso, next } = await searchParams;
  const message = aviso ? AVISOS[aviso] : undefined;

  // Only ever a same-origin path. `//evil.com` and `https://evil.com` are both
  // valid values for a `next` param an attacker can put in a link, and both
  // would turn this form into an open redirect.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  return (
    <AuthShell title="Entrar" subtitle="Bem-vindo de volta.">
      <MotionBanner
        show={!!message}
        testId="login-notice"
        className="bg-brand-soft text-brand-ink mb-4 rounded-xl px-4 py-2.5 text-sm"
      >
        {message}
      </MotionBanner>
      <MotionBanner
        show={!!error}
        testId="login-error"
        className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300"
      >
        {error}
      </MotionBanner>

      <MotionForm action={login} className="space-y-4" testId="login-form">
        {safeNext && (
          <input type="hidden" name="next" value={safeNext} data-testid="login-next" />
        )}
        <AuthField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          testId="login-email"
        />
        <AuthField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          testId="login-password"
        />
        <MotionButton
          type="submit"
          testId="login-submit"
          className="bg-brand hover:bg-brand-strong mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground"
        >
          Entrar
        </MotionButton>
      </MotionForm>

      <MotionItem className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-glass-edge" />
        <span className="text-muted-foreground text-xs">ou continue com</span>
        <span className="h-px flex-1 bg-glass-edge" />
      </MotionItem>

      <MotionItem>
        <GoogleButton next={safeNext} />
      </MotionItem>

      <MotionItem className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Ainda não tem conta? </span>
        <Link
          href="/signup"
          data-testid="login-signup-link"
          className="text-brand-ink font-semibold hover:underline"
        >
          Criar conta
        </Link>
      </MotionItem>
    </AuthShell>
  );
}
