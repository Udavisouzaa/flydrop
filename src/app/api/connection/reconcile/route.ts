import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAsaasConfigured } from "@/lib/asaas";
import { settleConnectionFee } from "@/lib/connection-settlement";
import { connectionReconcileSchema } from "@/lib/validations/payment";
import { clientIp, rateLimit } from "@/lib/rate-limit";

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "Muitas tentativas. Aguarde um pouco e tente de novo." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/**
 * "Já paguei" — saída para quando o webhook não chega.
 *
 * O cenário é real e não tem nada de exótico: a pessoa paga, o Asaas tenta
 * entregar o evento, a Vercel está fria ou fora do ar, e depois de algumas
 * tentativas ele desiste. A pessoa pagou e o contato não abriu. Sem esta rota
 * não há saída nenhuma dentro do produto — só mexer no banco à mão.
 *
 * O que ela **não** é: um jeito de destravar a pedido. Nada aqui confia no
 * cliente. O pedido só diz qual match olhar; quem responde se houve pagamento é
 * a API autenticada do Asaas, pela mesma função que o webhook usa. Um usuário
 * apertando o botão sem ter pagado recebe "ainda não identificamos" quantas
 * vezes tentar.
 */
export async function POST(request: NextRequest) {
  if (!isAsaasConfigured()) {
    return NextResponse.json(
      { error: "Pagamentos ainda não estão configurados neste ambiente" },
      { status: 501 }
    );
  }

  // Antes da autenticação, para que uma enxurrada deslogada saia barata.
  const ipLimit = await rateLimit("reconcileByIp", clientIp(request.headers));
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userLimit = await rateLimit("reconcileByUser", user.id);
  if (!userLimit.ok) return tooManyRequests(userLimit.retryAfter);

  const parsed = connectionReconcileSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Match inválido" }, { status: 400 });
  }
  const { match_id } = parsed.data;

  // O RLS já restringe `matches` às duas partes, mas resolver os ids aqui
  // também deixa a autorização legível sem ir ler a policy.
  const { data: match } = await supabase
    .from("matches")
    .select("id, unlocked_at, trips(traveler_id), orders(requester_id)")
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });
  }

  const trip = match.trips as unknown as { traveler_id: string } | null;
  const order = match.orders as unknown as { requester_id: string } | null;

  if (!trip || !order) {
    return NextResponse.json({ error: "Match incompleto" }, { status: 409 });
  }
  // Qualquer uma das duas partes pode conferir, não só quem gerou a cobrança:
  // o destravamento é o mesmo para as duas, e quem paga nem sempre é quem está
  // com a tela aberta na hora.
  if (![trip.traveler_id, order.requester_id].includes(user.id)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (match.unlocked_at) {
    return NextResponse.json({ unlocked: true, alreadyUnlocked: true });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Pagamentos ainda não estão configurados neste ambiente" },
      { status: 501 }
    );
  }

  // Cobranças deste match, da mais recente para a mais antiga. Em geral é uma
  // só; são várias quando o Pix expirou e a pessoa gerou outro. `succeeded`
  // entra na lista de propósito: é exatamente o estado de uma liquidação que
  // gravou o pagamento e morreu antes de destravar, e a rota existe para curar
  // esse caso.
  const { data: charges, error: chargesError } = await admin
    .from("payments")
    .select("psp_charge_id")
    .eq("match_id", match_id)
    .eq("kind", "connection_fee")
    .not("psp_charge_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (chargesError) {
    console.error("connection reconcile: charge lookup failed", chargesError);
    return NextResponse.json({ error: "Não foi possível conferir agora" }, { status: 500 });
  }

  if (!charges?.length) {
    return NextResponse.json(
      { error: "Nenhuma cobrança foi gerada para este match ainda" },
      { status: 404 }
    );
  }

  let sawError = false;

  for (const { psp_charge_id } of charges) {
    if (!psp_charge_id) continue;

    const outcome = await settleConnectionFee({
      admin,
      chargeId: psp_charge_id,
      // Sem `assertedByEvent`: aqui não existe evento nenhum, e o pedido do
      // usuário não é evidência de pagamento. Se o Asaas não responder, a
      // liquidação recusa em vez de destravar no escuro.
    });

    if (outcome.status === "unlocked" || outcome.status === "already") {
      return NextResponse.json({ unlocked: true });
    }
    if (outcome.status === "error") sawError = true;
  }

  // Nenhuma das cobranças estava paga. Separar "não consegui conferir" de
  // "confirmei que não caiu" importa: a primeira pede para tentar de novo, a
  // segunda pede para esperar.
  if (sawError) {
    return NextResponse.json(
      { error: "Não conseguimos falar com o provedor de pagamento agora. Tente em instantes." },
      { status: 503 }
    );
  }

  return NextResponse.json({ unlocked: false });
}
