"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name"));
  const phone = String(formData.get("phone"));
  const bio = String(formData.get("bio"));

  await supabase
    .from("profiles")
    .update({ full_name, phone, bio })
    .eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
