import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { respondToMatch, confirmPickup, confirmDropoff } from "../actions";
import { createReview } from "../reviews";
import Chat from "@/components/Chat";
import ConnectionPaywall from "@/components/ConnectionPaywall";
import BackLink from "@/components/BackLink";
import type { Match, Trip, Order, ProfilePublic, Message } from "@/types/database";

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
  };

  // Cross-user profile lookups must go through profiles_public: the base
  // `profiles` table only allows selecting your own row under RLS now.
  const [{ data: traveler }, { data: requester }] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("*")
      .eq("id", m.trips.traveler_id)
      .single(),
    supabase
      .from("profiles_public")
      .select("*")
      .eq("id", m.orders.requester_id)
      .single(),
  ]);

  const isTraveler = user.id === m.trips.traveler_id;
  const isRequester = user.id === m.orders.requester_id;
  const otherProfile = isTraveler
    ? (requester as ProfilePublic | null)
    : (traveler as ProfilePublic | null);
  const otherUserId = isTraveler ? m.orders.requester_id : m.trips.traveler_id;
  const canRespond = m.status === "pending" && user.id !== m.created_by;

  const isUnlocked = Boolean(m.unlocked_at);
  let unlockedContact: { full_name: string | null; phone: string | null } | null = null;
  if (isUnlocked && m.status === "accepted") {
    const { data: contactRows } = await supabase.rpc("get_unlocked_contact", {
      p_match_id: m.id,
    });
    unlockedContact = contactRows?.[0] ?? null;
  }

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
    <div className="mx-auto max-w-lg px-4 pt-6 pb-2">
      <BackLink href="/tracking" label="Acompanhar" />

      <section className="glass rounded-3xl p-5">
        <h1 className="text-xl font-black tracking-tight">{m.orders.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {m.trips.origin_city} → {m.trips.destination_city} · partida em{" "}
          {new Date(m.trips.departure_date).toLocaleDateString("pt-BR")}
        </p>
        <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span>Com: {otherProfile?.full_name ?? "Usuário Malotex"}</span>
          {otherProfile?.avg_rating != null && (
            <span>
              ⭐ {Number(otherProfile.avg_rating).toFixed(1)}
              {otherProfile.total_reviews ? ` (${otherProfile.total_reviews})` : ""}
            </span>
          )}
          {otherProfile?.kyc_verified && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              ✓ Identidade verificada
            </span>
          )}
        </p>
        <span className="glass-weak mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold">
          {statusLabel[m.status]}
        </span>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {decodeURIComponent(error)}
        </p>
      )}

      {canRespond && (
        <div className="mt-4 flex gap-3">
          <form action={respondToMatch} className="flex-1">
            <input type="hidden" name="match_id" value={m.id} />
            <input type="hidden" name="decision" value="accepted" />
            <button
              type="submit"
              className="bg-brand hover:bg-brand-strong w-full rounded-2xl py-3.5 font-semibold text-brand-foreground transition-transform active:scale-[0.99]"
            >
              Aceitar
            </button>
          </form>
          <form action={respondToMatch} className="flex-1">
            <input type="hidden" name="match_id" value={m.id} />
            <input type="hidden" name="decision" value="declined" />
            <button
              type="submit"
              className="glass-btn w-full rounded-2xl py-3.5 font-semibold transition-transform active:scale-[0.99]"
            >
              Recusar
            </button>
          </form>
        </div>
      )}

      {m.status === "accepted" && (
        <div className="mt-6">
          <h2 className="mb-2 px-1 text-base font-bold">Combine os detalhes</h2>

          {isUnlocked ? (
            <>
              <div className="mb-4 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Contato liberado
                </p>
                <p className="mt-1 text-sm">
                  {unlockedContact?.full_name ?? otherProfile?.full_name} ·{" "}
                  {unlockedContact?.phone ? (
                    <a
                      href={`https://wa.me/${unlockedContact.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-ink hover:underline"
                    >
                      {unlockedContact.phone}
                    </a>
                  ) : (
                    "Telefone não informado"
                  )}
                </p>
              </div>
              <Chat matchId={m.id} currentUserId={user.id} initialMessages={messages} />
              <p className="text-muted-foreground mt-3 text-xs">
                Prefira combinar a entrega em locais públicos e seguros, como
                aeroportos ou shoppings.
              </p>
            </>
          ) : (
            <ConnectionPaywall
              matchId={m.id}
              connectionFee={m.connection_fee}
              otherName={otherProfile?.full_name ?? "essa pessoa"}
            />
          )}

          <div className="glass mt-4 rounded-3xl p-5">
            <h3 className="font-bold">Confirmação de entrega</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>
                  Viajante coletou o item
                  {m.traveler_confirmed_pickup ? " ✅" : ""}
                </span>
                {isTraveler && !m.traveler_confirmed_pickup && (
                  <form action={confirmPickup}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <button
                      type="submit"
                      className="glass-btn shrink-0 rounded-full px-4 py-2 text-xs font-semibold"
                    >
                      Confirmar coleta
                    </button>
                  </form>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>
                  Destinatário recebeu o item
                  {m.requester_confirmed_dropoff ? " ✅" : ""}
                </span>
                {isRequester && !m.requester_confirmed_dropoff && (
                  <form action={confirmDropoff}>
                    <input type="hidden" name="match_id" value={m.id} />
                    <button
                      type="submit"
                      className="bg-brand hover:bg-brand-strong shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-brand-foreground"
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
        <p className="text-muted-foreground glass mt-4 rounded-2xl p-4 text-sm">
          Aguardando a outra parte aceitar o match.
        </p>
      )}

      {m.status === "declined" && (
        <p className="text-muted-foreground glass mt-4 rounded-2xl p-4 text-sm">
          Esse match foi recusado.
        </p>
      )}

      {m.status === "completed" && (
        <div className="mt-6">
          <h2 className="mb-2 px-1 text-base font-bold text-green-600 dark:text-green-400">
            Entrega concluída! 🎉
          </h2>
          {alreadyReviewed ? (
            <p className="text-muted-foreground glass rounded-2xl p-4 text-sm">
              Obrigado por avaliar {otherProfile?.full_name ?? "essa entrega"}.
            </p>
          ) : (
            <form action={createReview} className="glass space-y-3 rounded-3xl p-5">
              <input type="hidden" name="match_id" value={m.id} />
              <input type="hidden" name="reviewed_user_id" value={otherUserId} />
              <label className="block text-sm font-medium">
                Como foi sua experiência com {otherProfile?.full_name ?? "essa pessoa"}?
              </label>
              <select
                name="rating"
                required
                defaultValue=""
                className="glass-weak focus:border-brand-ink w-full rounded-xl px-3.5 py-3 text-base outline-none"
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
                className="glass-weak focus:border-brand-ink w-full resize-none rounded-xl px-3.5 py-3 text-base outline-none"
              />
              <button
                type="submit"
                className="bg-brand hover:bg-brand-strong w-full rounded-2xl py-3.5 text-base font-semibold text-brand-foreground transition-transform active:scale-[0.99]"
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
