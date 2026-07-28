"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { signupSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { TERMS_VERSION } from "@/lib/legal";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    accept_terms: formData.get("accept_terms") === "on",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  // Bounds automated account creation, which is what would otherwise let
  // someone farm accounts to scrape listings.
  const byIp = await rateLimit("signupByIp", clientIp(await headers()));
  if (!byIp.ok) {
    const minutes = Math.ceil(byIp.retryAfter / 60);
    redirect(
      `/signup?error=${encodeURIComponent(
        `Muitas contas criadas a partir daqui. Tente novamente em ${minutes} minuto${
          minutes === 1 ? "" : "s"
        }.`
      )}`
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      data: {
        full_name: v.full_name,
        phone: v.phone || null,
        // LGPD Art. 8: consent has to be demonstrable. Stamped into the auth
        // user's metadata so there is a record of when it was given and to
        // which version of the terms.
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      },
    },
  });

  if (error) {
    console.error("[signup] sign-up failed", error.message);
    redirect(
      `/signup?error=${encodeURIComponent(
        "Não foi possível criar a conta. Verifique os dados e tente de novo."
      )}`
    );
  }

  if (!data.session) {
    redirect("/login?aviso=confirme");
  }

  redirect("/dashboard");
}
