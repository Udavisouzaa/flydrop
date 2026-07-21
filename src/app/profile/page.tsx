import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const { user, profile } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">{user.email}</p>

      <form action={updateProfile} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nome completo</span>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Telefone</span>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Sobre você</span>
          <textarea
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:border-orange-500 dark:border-white/20"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
