import Link from "next/link";
import { signup } from "./actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Criar conta</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-orange-500 hover:underline">
          Entrar
        </Link>
      </p>

      <MotionBanner
        show={!!error}
        className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
      >
        {error}
      </MotionBanner>

      <MotionForm action={signup} className="mt-8 space-y-4">
        <Field label="Nome completo" name="full_name" type="text" required />
        <Field label="Telefone" name="phone" type="tel" />
        <Field label="E-mail" name="email" type="email" required />
        <Field
          label="Senha"
          name="password"
          type="password"
          required
          minLength={6}
        />
        <MotionButton
          type="submit"
          className="w-full rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
        >
          Criar conta
        </MotionButton>
      </MotionForm>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <MotionItem>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{label}</span>
        <input
          name={name}
          type={type}
          required={required}
          minLength={minLength}
          className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
        />
      </label>
    </MotionItem>
  );
}
