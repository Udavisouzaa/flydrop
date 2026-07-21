import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { respondToMatch } from "../actions";
import Chat from "@/components/Chat";
import type { Match, Trip, Order, Profile, Message } from "@/types/database";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  declined: "Recusado",
  completed: "Concluído",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*, trips(*), orders(*)")
    .eq("id", id)
    .single();

  if (!match) notFound();
  const m = match as Match & { trips: Trip; orders: Order };

  const [{ data: traveler }, { data: requester }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", m.trips.traveler_id).single(),
    supabase.from("profiles").select("*").eq("id", m.orders.requester_id).single(),
  ]);

  const isTraveler = user.id === m.trips.traveler_id;
  const isRequester = user.id === m.orders.requester_id;
  const otherProfile = isTraveler
    ? (requester as Profile | null)
    : (traveler as Profile | null);
  const canRespond = m.status === "pending" && user.id !== m.created_by;

  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", m.id)
    .order("created_at", { ascending: true });
  const messages = (messagesData ?? []) as Message[];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">{m.orders.title}</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        {m.trips.origin_city} → {m.trips.destination_city} · partida em{" "}
        {new Date(m.trips.departure_date).toLocaleDateString("pt-BR")}
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Com: {otherProfile?.full_name ?? "Usuário Flydrop"}
      </p>
      <span className="mt-3 inline-block rounded-full bg-black/5 px-3 py-1 text-xs font-medium dark:bg-white/10">
        {statusLabel[m.status]}
      </span>

      {canRespond && (
        <div className="mt-6 flex gap-3">
          <form action={respondToMatch}>
            <input type="hidden" name="match_id" value={m.id} />
            <input type="hidden" name="decision" value="accepted" />
            <button
              type="submit"
              className="rounded-full bg-orange-500 px-6 py-3 font-medium text-white hover:bg-orange-600"
            >
              Aceitar
            </button>
          </form>
          <form action={respondToMatch}>
            <input type="hidden" name="match_id" value={m.id} />
            <input type="hidden" name="decision" value="declined" />
            <button
              type="submit"
              className="rounded-full border border-black/10 px-6 py-3 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
            >
              Recusar
            </button>
          </form>
        </div>
      )}

      {m.status === "accepted" && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold">Combine os detalhes</h2>
          <Chat matchId={m.id} currentUserId={user.id} initialMessages={messages} />
          <p className="mt-3 text-xs text-neutral-500">
            Prefira combinar a entrega em locais públicos e seguros, como
            aeroportos ou shoppings.
          </p>
        </div>
      )}

      {m.status === "pending" && !canRespond && (
        <p className="mt-6 text-sm text-neutral-500">
          Aguardando a outra parte aceitar o match.
        </p>
      )}

      {m.status === "declined" && (
        <p className="mt-6 text-sm text-neutral-500">Esse match foi recusado.</p>
      )}
    </div>
  );
}
