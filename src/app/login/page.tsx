import Link from "next/link";
import { login } from "./actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="text-orange-500 hover:underline">
          Cadastre-se
        </Link>
      </p>

      <MotionBanner
        show={!!message}
        className="mt-4 rounded-lg bg-orange-50 px-4 py-2 text-sm text-orange-600 dark:bg-orange-950 dark:text-orange-400"
      >
        {message}
      </MotionBanner>
      <MotionBanner
        show={!!error}
        className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
      >
        {error}
      </MotionBanner>

      <MotionForm action={login} className="mt-8 space-y-4">
        <MotionItem>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">E-mail</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
            />
          </label>
        </MotionItem>
        <MotionItem>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Senha</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
            />
          </label>
        </MotionItem>
        <MotionButton
          type="submit"
          className="w-full rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
        >
          Entrar
        </MotionButton>
      </MotionForm>
    </div>
  );
}
