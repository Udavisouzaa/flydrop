import { MotionItem } from "@/components/motion";

/** Moldura comum de /login e /signup: nada além do necessário para entrar. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/*
          Wordmark, not a link. It used to point at /landing — the archived
          scrollytelling page — so tapping the logo on the login screen dropped
          you into marketing you had already decided to skip. And "/" just
          bounces back here when logged out, so there is nowhere useful for it
          to go: it is decoration, and now it behaves like decoration.
        */}
        <p className="mb-6 block text-center text-3xl font-black tracking-tighter">
          Malo<span className="text-brand-ink">tex</span>
        </p>

        <div className="glass rounded-3xl p-6 sm:p-7" data-testid="auth-shell">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthField({
  label,
  name,
  type,
  autoComplete,
  required,
  minLength,
  defaultValue,
  testId,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  testId?: string;
}) {
  return (
    <MotionItem>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">{label}</span>
        <input
          name={name}
          type={type}
          data-testid={testId}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          defaultValue={defaultValue}
          className="glass-weak focus:border-brand-ink w-full rounded-xl px-3.5 py-3 text-base outline-none"
        />
      </label>
    </MotionItem>
  );
}
