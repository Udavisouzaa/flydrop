"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Logo oficial do Google, nas quatro cores da marca.
 *
 * Inline e não <img> por dois motivos: a CSP não permite origem externa de
 * imagem sem afrouxar `img-src`, e um ícone que depende de rede pode aparecer
 * depois do texto — num botão de marca, isso é justamente o que o guia proíbe.
 * As cores são fixas de propósito: `currentColor` aqui violaria o guia, e no
 * tema escuro o G viraria um borrão branco.
 */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Entra com o Google via OAuth.
 *
 * O redirect volta em /auth/callback, que é quem troca o `?code=` por uma
 * sessão em cookie. `next` é repassado para que quem caiu no login por causa
 * de uma página protegida volte para ela, e não para o dashboard.
 */
export function GoogleButton({ next }: { next?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setFailed(false);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });

    // Em caso de sucesso o navegador já saiu da página, então este código só
    // roda quando algo falhou antes do redirect — e aí o botão precisa voltar
    // a ser clicável, senão a tela fica morta sem explicação.
    if (error) {
      console.error("[google-button] signInWithOAuth failed", error.message);
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        data-testid="login-google"
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3.5 text-base font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <GoogleLogo />
        {loading ? "Abrindo o Google…" : "Continuar com o Google"}
      </button>

      {failed && (
        <p
          data-testid="login-google-error"
          className="mt-2 text-center text-sm text-red-600 dark:text-red-300"
        >
          Não foi possível abrir o Google. Tente de novo.
        </p>
      )}
    </>
  );
}
