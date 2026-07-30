-- Migration 0013: destravar a criação de propostas
-- STATUS: APLICADA em 30/07/2026 em produção.
--
-- O BUG
--
-- Desde que a 0009 foi aplicada (29/07), *nenhuma* proposta pode ser criada em
-- produção. Todo INSERT em `matches` morre com:
--
--   SQLSTATE 42501 — permission denied for function calc_connection_fee
--
-- A 0009 criou um impasse consigo mesma:
--
--   linha 60  REVOKE ALL ON FUNCTION calc_connection_fee FROM authenticated
--   linha 109 guard_match_insert() chama calc_connection_fee(NEW.order_id)
--
-- e `guard_match_insert` é SECURITY INVOKER de propósito (a 0009 explica por
-- quê: dentro de SECURITY DEFINER o `current_user` vira `postgres` e a checagem
-- de papel ficaria morta em silêncio). Sendo INVOKER, o trigger executa como
-- `authenticated` — exatamente o papel de quem o REVOKE tirou o EXECUTE.
--
-- O usuário vê "Não foi possível criar a proposta." porque
-- src/app/matches/actions.ts esconde a mensagem crua do Postgres de propósito.
--
-- POR QUE NÃO SIMPLESMENTE DAR O GRANT DE VOLTA
--
-- `GRANT EXECUTE ... TO authenticated` resolveria, mas devolveria a função para
-- `/rest/v1/rpc/calc_connection_fee`, chamável por qualquer usuário logado com
-- qualquer order_id. Era isso que a 0009 quis evitar.
--
-- A SAÍDA
--
-- Mover a função para o schema `private`, que o PostgREST não expõe (ele serve
-- apenas `public`, `graphql_public` e `storage`). O trigger continua podendo
-- chamá-la; a internet, não. A função segue SECURITY DEFINER para ler
-- `orders.budget` sem depender do RLS de quem propõe — senão um viajante que
-- não enxergasse o pedido calcularia a taxa sobre um budget nulo e pagaria
-- 9,90 em vez do valor certo.
--
-- Só o INSERT estava quebrado: `guard_match_update` não chama a função.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.calc_connection_fee(p_order_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN o.budget IS NULL OR o.budget <= 0 THEN 9.90
    ELSE ROUND(LEAST(29.90, GREATEST(4.90, o.budget * 0.10)), 2)
  END
  FROM public.orders o
  WHERE o.id = p_order_id;
$$;

REVOKE ALL ON FUNCTION private.calc_connection_fee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.calc_connection_fee(UUID) TO authenticated, service_role;

-- Idêntica à versão da 0009, trocando só a chamada da função. Repetida por
-- inteiro porque CREATE OR REPLACE não permite alterar uma linha isolada.
CREATE OR REPLACE FUNCTION public.guard_match_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_traveler_id  UUID;
  v_requester_id UUID;
  v_uid          UUID;
  v_fee          NUMERIC;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  v_uid := (SELECT auth.uid());
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'é preciso estar autenticado para propor um match';
  END IF;

  SELECT t.traveler_id, o.requester_id
    INTO v_traveler_id, v_requester_id
  FROM public.trips t, public.orders o
  WHERE t.id = NEW.trip_id AND o.id = NEW.order_id;

  IF v_traveler_id IS NULL OR v_requester_id IS NULL THEN
    RAISE EXCEPTION 'viagem ou pedido inexistente';
  END IF;

  IF v_uid NOT IN (v_traveler_id, v_requester_id) THEN
    RAISE EXCEPTION 'só as partes envolvidas podem propor um match';
  END IF;

  IF v_traveler_id = v_requester_id THEN
    RAISE EXCEPTION 'viagem e pedido pertencem à mesma pessoa';
  END IF;

  v_fee := private.calc_connection_fee(NEW.order_id);
  IF v_fee IS NULL THEN
    RAISE EXCEPTION 'não foi possível calcular a taxa de conexão';
  END IF;

  NEW.connection_fee               := v_fee;
  NEW.created_by                   := v_uid;
  NEW.status                       := 'pending';
  NEW.accepted_at                  := NULL;
  NEW.completed_at                 := NULL;
  NEW.declined_reason              := NULL;
  NEW.traveler_confirmed_pickup    := FALSE;
  NEW.traveler_confirmed_pickup_at := NULL;
  NEW.requester_confirmed_dropoff  := FALSE;
  NEW.requester_confirmed_dropoff_at := NULL;
  NEW.agreed_price                 := NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_match_insert() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.calc_connection_fee(UUID);
