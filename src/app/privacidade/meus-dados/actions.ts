"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { DPO_EMAIL } from "@/lib/legal";

/** What the user has to type to arm the delete. Case-sensitive on purpose. */
const CONFIRM_PHRASE = "EXCLUIR";

function fail(message: string): never {
  redirect(`/privacidade/meus-dados?error=${encodeURIComponent(message)}`);
}

/**
 * LGPD Art. 18, VI — elimination of personal data.
 *
 * Deletes the auth user, which cascades through `profiles` and from there
 * through everything that references it: trips, orders, matches, messages,
 * reviews, notifications and payment rows. There is no soft-delete and no
 * grace period; when this returns, the account is gone.
 *
 * Requires the service-role client. A user cannot delete their own row in
 * `auth.users` with an anon key — by design, since that table is outside RLS.
 */
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Cheap guard against a stuck form resubmitting in a loop.
  const limit = await rateLimit("writeByUser", `delete:${user.id}`);
  if (!limit.ok) {
    fail("Muitas tentativas seguidas. Aguarde um minuto e tente de novo.");
  }

  if (formData.get("confirmacao") !== CONFIRM_PHRASE) {
    fail(`Para confirmar, digite ${CONFIRM_PHRASE} exatamente como está escrito.`);
  }

  // An accepted match means someone paid a connection fee and is waiting on a
  // delivery. Erasing the account mid-transaction would leave the counterpart
  // with no way to reach the person they paid to reach. LGPD Art. 18 §4 allows
  // refusing a request when there is a competing legal basis, and Art. 16, III
  // permits retention for the exercise of rights — this is that case, and it is
  // temporary: finish or decline the match and the block lifts.
  const { data: emAndamento, error: matchError } = await supabase
    .from("matches")
    .select("id, trips!inner(traveler_id), orders!inner(requester_id)")
    .eq("status", "accepted");

  if (matchError) {
    console.error("[deleteAccount] falha ao checar matches", matchError.message);
    fail("Não foi possível verificar suas entregas em andamento. Tente de novo.");
  }

  // RLS already narrows `matches` to the caller's own, but re-check the parties
  // explicitly rather than trusting a policy to be the authorization.
  const bloqueado = (emAndamento ?? []).some((m) => {
    const trip = m.trips as unknown as { traveler_id?: string } | null;
    const order = m.orders as unknown as { requester_id?: string } | null;
    return trip?.traveler_id === user.id || order?.requester_id === user.id;
  });

  if (bloqueado) {
    fail(
      "Você tem uma entrega em andamento. Conclua ou recuse esse match antes de excluir a conta."
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[deleteAccount] service role ausente", err);
    fail(
      `A exclusão automática está indisponível neste ambiente. Escreva para ${DPO_EMAIL} que fazemos manualmente.`
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[deleteAccount] deleteUser falhou", error.message);
    fail("Não foi possível excluir a conta agora. Tente de novo em alguns minutos.");
  }

  // The session cookies outlive the user row, so clear them explicitly —
  // otherwise the next request carries a token for an account that no longer
  // exists and the app renders a logged-in shell with nothing behind it.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  redirect("/login?aviso=excluida");
}
