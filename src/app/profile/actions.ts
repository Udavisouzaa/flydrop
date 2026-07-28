"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateProfileSchema } from "@/lib/validations/profile";
import { rateLimit } from "@/lib/rate-limit";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const limit = await rateLimit("writeByUser", user.id);
  if (!limit.ok) {
    redirect(
      `/profile?error=${encodeURIComponent(
        "Muitas alterações em pouco tempo. Aguarde alguns minutos."
      )}`
    );
  }

  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
    bio: formData.get("bio") ?? "",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados inválidos";
    redirect(`/profile?error=${encodeURIComponent(message)}`);
  }

  const v = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: v.full_name, phone: v.phone || null, bio: v.bio || null })
    .eq("id", user.id);

  if (error) {
    console.error("[updateProfile] update failed", error);
    redirect(
      `/profile?error=${encodeURIComponent(
        "Não foi possível salvar as alterações."
      )}`
    );
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?ok=1");
}
