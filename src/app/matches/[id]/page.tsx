import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { respondToMatch, confirmPickup, confirmDropoff } from "../actions";
import { createReview } from "../reviews";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("*, trips(*), orders(*)")
    .eq("id", id)
    .single();

  if (!match) notFound();
  const m = match as Match & {
    trips: Trip;
    orders: Order;
    // Present once migration 0002 is applied; optional until then.
    traveler_confirmed_pickup?: boolean;
    requester_confirmed_dropoff?: boolean;
  };

  const [{ data: traveler }, { data: requester }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", m.trips.traveler_id).single(),
    supabase.from("profiles").select("*").eq("id", m.orders.requester_id).single(),
  ]);

  const isTraveler = user.id === m.trips.traveler_id;
  const isRequester = user.id === m.orders.requester_id;
  const otherProfile = isTraveler
    ? (requester as Profile | null)
    : (traveler as Profile | null);
  const otherUserId = isTraveler ? m.orders.requester_id : m.trips.traveler_id;
  const canRespond = m.status === "pending" && user.id !== m.created_by;

  const { data: messagesData } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", m.id)
    .order("created_at", { ascending: true });
  const messages = (messagesData ?? []) as Message[];

  // Reviews only work once migration 0003 is applied; fails gracefully to []
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("reviewer_id")
    .eq("match_id", m.id);
  const alreadyReviewed = (existingReviews ?? []).some(
    (r) => r.reviewer_id === user.id
  );

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

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {decodeURIComponent(error)}
        </p>
      )}

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

          <div className="mt-6 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <h3 className="font-semibold">Confirmação de entrega</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  Viajante coletou o item
                  {m.traveler_confirmed_pickup ? " ✅" : ""}
                </span>
                {isTraveler && !m.traveler_confirmed_pickup && (
                  <form action={confirmPickup}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
                    >
                      Confirmar coleta
                    </button>
                  </form>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>
                  Destinatário recebeu o item
                  {m.requester_confirmed_dropoff ? " ✅" : ""}
                </span>
                {isRequester && !m.requester_confirmed_dropoff && (
                  <form action={confirmDropoff}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                    >
                      Confirmar recebimento
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
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

      {m.status === "completed" && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold text-green-600 dark:text-green-400">
            Entrega concluída! 🎉
          </h2>
          {alreadyReviewed ? (
            <p className="text-sm text-neutral-500">
              Obrigado por avaliar {otherProfile?.full_name ?? "essa entrega"}.
            </p>
          ) : (
            <form
              action={createReview}
              className="space-y-3 rounded-2xl border border-black/10 p-4 dark:border-white/10"
            >
              <input type="hidden" name="match_id" value={m.id} />
              <input type="hidden" name="reviewed_user_id" value={otherUserId} />
              <label className="block text-sm font-medium">
                Como foi sua experiência com {otherProfile?.full_name ?? "essa pessoa"}?
              </label>
              <select
                name="rating"
                required
                defaultValue=""
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-white/20"
              >
                <option value="" disabled>
                  Nota (1 a 5)
                </option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"⭐".repeat(n)} ({n})
                  </option>
                ))}
              </select>
              <textarea
                name="comment"
                placeholder="Deixe um comentário (opcional)"
                rows={3}
                className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-white/20"
              />
              <button
                type="submit"
                className="rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Enviar avaliação
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
