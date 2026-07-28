import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * A raiz não tem tela própria: o LevAí é um web app, não um site. A landing
 * de scrollytelling continua viva em /landing para campanha, mas quem abre o
 * domínio cai direto no app (ou no login, se ainda não entrou).
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
