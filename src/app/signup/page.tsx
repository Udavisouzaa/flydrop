import Link from "next/link";
import { signup } from "./actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";
import { AuthShell, AuthField } from "@/components/auth-shell";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell title="Criar conta" subtitle="Leva menos de um minuto.">
      <MotionBanner
        show={!!error}
        testId="signup-error"
        className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300"
      >
        {error}
      </MotionBanner>

      <MotionForm action={signup} className="space-y-4" testId="signup-form">
        <AuthField
          label="Nome completo"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          testId="signup-name"
        />
        <AuthField
          label="Telefone"
          name="phone"
          type="tel"
          autoComplete="tel"
          testId="signup-phone"
        />
        <AuthField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          testId="signup-email"
        />
        <AuthField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          // Matches signupSchema (min 8). It used to say 6, so the browser
          // let a 7-character password through only for the server to reject it.
          minLength={8}
          testId="signup-password"
        />

        {/*
          LGPD Art. 8: consent has to be an affirmative act, and the controller
          has to be able to demonstrate it. Unchecked by default, required, and
          the action stamps the version and timestamp onto the user record.
        */}
        <MotionItem>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <span className="relative mt-0.5 flex shrink-0 items-center">
              <input
                type="checkbox"
                name="accept_terms"
                required
                data-testid="signup-terms"
                className="peer checked:border-brand checked:bg-brand size-5 cursor-pointer appearance-none rounded border-2 border-neutral-300 transition-all dark:border-neutral-700"
              />
              <svg
                aria-hidden
                className="text-brand-foreground pointer-events-none absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity peer-checked:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-muted-foreground leading-snug">
              Li e aceito os{" "}
              <Link
                href="/termos"
                target="_blank"
                data-testid="signup-terms-link"
                className="text-brand-ink font-semibold hover:underline"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                data-testid="signup-privacy-link"
                className="text-brand-ink font-semibold hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
        </MotionItem>

        <MotionButton
          type="submit"
          testId="signup-submit"
          className="bg-brand hover:bg-brand-strong mt-2 w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground"
        >
          Criar conta
        </MotionButton>
      </MotionForm>

      <MotionItem className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Já tem uma conta? </span>
        <Link
          href="/login"
          data-testid="signup-login-link"
          className="text-brand-ink font-semibold hover:underline"
        >
          Entrar
        </Link>
      </MotionItem>
    </AuthShell>
  );
}
