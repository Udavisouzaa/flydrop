"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { signupSchema } from "@/lib/validations/auth";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      data: { full_name: v.full_name, phone: v.phone || null },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/login?message=Confirme seu e-mail para entrar.");
  }

  redirect("/dashboard");
}
