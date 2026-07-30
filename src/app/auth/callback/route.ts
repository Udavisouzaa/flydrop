import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Onde o Google devolve o usuário depois do consentimento.
 *
 * O `createBrowserClient` do @supabase/ssr usa PKCE: o provedor volta com um
 * `?code=` de uso único, e alguém precisa trocá-lo pela sessão *no servidor*,
 * porque é o servidor que grava os cookies que o resto do app lê. Sem esta
 * rota o usuário volta do Google com o código na URL e nada acontece.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // O Google manda `error=access_denied` quando o usuário desiste na tela de
  // consentimento. Não é falha: é uma escolha, e merece a tela de login limpa.
  const providerError = searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(new URL("/login", origin), 303);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Não foi possível entrar com o Google.")}`,
        origin
      ),
      303
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Mesma regra do login por senha: a mensagem crua do Supabase vira um
    // oráculo sobre quais contas existem. Loga e mostra algo neutro.
    console.error("[auth/callback] code exchange failed", error.message);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Não foi possível entrar com o Google.")}`,
        origin
      ),
      303
    );
  }

  // Só caminho deste site. `next` chega do query string, e sem esta checagem a
  // rota vira um open redirect assinado pela nossa própria autenticação.
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return NextResponse.redirect(new URL(safeNext, origin), 303);
}
