-- Migration 0015: a taxa de conexão passa a ser valor fixo
--
-- Até aqui a taxa era 10% do orçamento do pedido, limitada entre R$ 4,90 e
-- R$ 29,90 (fórmula na 0009, movida para o schema `private` na 0013). Duas
-- coisas derrubaram esse desenho, na ordem em que importam:
--
--   1. O piso de R$ 4,90 fica abaixo do valor mínimo de cobrança do Asaas
--      (R$ 5,00). Como o piso vale para todo pedido com orçamento abaixo de
--      R$ 50, a faixa mais comum de pedido geraria uma cobrança que o PSP
--      recusa na criação — e o usuário veria apenas "não foi possível gerar a
--      cobrança", sem nada que apontasse a causa. Nenhum match chegou a passar
--      por isso porque os pedidos existentes têm orçamento alto o bastante;
--      era uma falha esperando o primeiro pedido barato.
--
--   2. `orders.budget` é digitado pelo solicitante e ninguém confere. Amarrar a
--      única receita da plataforma a esse número convidava a subdeclarar.
--
-- R$ 19,90 é o valor decidido para o caso normal. O segundo patamar de
-- R$ 39,90 depende do conceito de pedido prioritário, que ainda não existe no
-- schema — quando existir, a função volta a olhar o pedido, e é por isso que o
-- parâmetro `p_order_id` continua aqui mesmo sem uso hoje.
--
-- ORDEM DE DEPLOY — compatível nos dois sentidos, pode ir antes ou depois do
-- código. A função é a fonte da verdade: o trigger de INSERT sobrescreve
-- `connection_fee` com o que ela devolve, então o valor calculado em
-- src/app/matches/actions.ts nunca é o que fica gravado. Aplicar esta migration
-- sozinha já muda o preço; subir o código sozinho não muda nada.

-- ---------------------------------------------------------------------------
-- 1. A fórmula
-- ---------------------------------------------------------------------------
--
-- Deixa de ser SECURITY DEFINER. O privilégio existia por um motivo específico
-- registrado na 0013: ler `orders.budget` sem depender do RLS de quem propõe,
-- senão um viajante que não enxergasse o pedido calcularia a taxa sobre um
-- budget nulo. Sem leitura de tabela nenhuma, esse motivo desapareceu e manter
-- o privilégio seria só superfície exposta à toa.

CREATE OR REPLACE FUNCTION private.calc_connection_fee(p_order_id UUID)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT 19.90::NUMERIC;
$$;

REVOKE ALL ON FUNCTION private.calc_connection_fee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.calc_connection_fee(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Matches que ainda não foram pagos
-- ---------------------------------------------------------------------------
--
-- Quem já pagou pagou pelo preço vigente na época, e reescrever isso faria o
-- histórico contradizer o recibo. Por isso o UPDATE exclui match destravado e
-- qualquer match que tenha um pagamento não-fracassado registrado — inclusive
-- os pendentes, porque a cobrança já foi emitida no Asaas com o valor antigo e
-- o webhook confere o que foi pago contra `payments.amount_total`, não contra
-- este campo.
--
-- `IS DISTINCT FROM` e não `<>`: `payments.status` aceita NULL, e com `<>` uma
-- linha de status nulo devolveria NULL, o EXISTS não casaria e o match teria o
-- preço reescrito apesar de já ter cobrança emitida. Aqui o lado seguro é
-- tratar o desconhecido como "existe pagamento" e não mexer.
--
-- O SET LOCAL ROLE não é contorno: `connection_fee` é protegido pelo trigger
-- guard_unlock_fields, que recusa qualquer UPDATE do campo vindo de quem não
-- seja `service_role` — é o que impede uma das partes de PATCHar o próprio
-- preço via PostgREST. Sem isto a migration falha com "campos de unlock só
-- podem ser alterados pelo webhook de pagamento". Assumir o papel é a porta que
-- o próprio guard reconhece, e é preferível a desligar o trigger: se o UPDATE
-- abaixo violasse outra regra, ela continuaria valendo.

SET LOCAL ROLE service_role;

UPDATE public.matches m
SET connection_fee = 19.90
WHERE m.unlocked_at IS NULL
  AND m.connection_fee IS DISTINCT FROM 19.90
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.match_id = m.id
      AND p.kind = 'connection_fee'
      AND p.status IS DISTINCT FROM 'failed'
  );

RESET ROLE;
