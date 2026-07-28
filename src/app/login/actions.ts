"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { loginSchema } from "@/lib/validations/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  // Two budgets, because they stop different attacks: per-email stops someone
  // grinding one account's password, per-IP stops one host spraying a common
  // password across many accounts.
  const ip = clientIp(await headers());
  const emailKey = v.email.trim().toLowerCase();

  const [byEmail, byIp] = await Promise.all([
    rateLimit("loginByEmail", emailKey),
    rateLimit("loginByIp", ip),
  ]);

  if (!byEmail.ok || !byIp.ok) {
    const minutes = Math.ceil(
      Math.max(byEmail.retryAfter, byIp.retryAfter) / 60
    );
    redirect(
      `/login?error=${encodeURIComponent(
        `Muitas tentativas de acesso. Tente novamente em ${minutes} minuto${
          minutes === 1 ? "" : "s"
        }.`
      )}`
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: v.email,
    password: v.password,
  });

  if (error) {
    // Never echo Supabase's message: it distinguishes "Invalid login
    // credentials" from "Email not confirmed", which turns the login form into
    // an oracle for whether an address has an account here.
    console.error("[login] sign-in failed", error.message);
    redirect(
      `/login?error=${encodeURIComponent("E-mail ou senha incorretos.")}`
    );
  }

  redirect(safeNext(formData.get("next")) ?? "/dashboard");
}

/**
 * Accept a post-login destination only if it is a path on this site.
 * `//evil.com` parses as a protocol-relative URL, so checking for a leading
 * slash alone is not enough.
 */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
