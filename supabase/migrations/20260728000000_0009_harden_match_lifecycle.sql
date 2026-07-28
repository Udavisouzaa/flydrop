-- Migration 0009: taxa de conexão e ciclo de vida do match viram server-side
-- STATUS: PENDING APPROVAL — revisar antes de aplicar no projeto de produção.
--
-- Contexto: hoje a única RLS de escrita em `matches` é
--   "Match participants can update their matches" USING (caller é uma das partes)
-- sem restrição de coluna, e a policy de INSERT tem a mesma forma. O
-- trg_guard_unlock_fields (migration de 2026-07-25) cobre unlocked_at,
-- unlocked_by e connection_fee — mas connection_fee só no ramo UPDATE.
--
-- Consequências verificáveis via PostgREST direto, sem passar pelo app:
--
--   A. FURO DE RECEITA. `POST /rest/v1/matches` com
--      {trip_id, order_id, connection_fee: 0.01} passa: no INSERT o guard só
--      olha unlocked_at/unlocked_by. Depois é só aceitar e chamar
--      /api/connection/checkout, que lê `match.connection_fee` do banco e gera
--      o Pix por esse valor. A taxa de conexão é a única receita do LevAí.
--
--   B. AUTO-ACEITE. `status` não é validado em lugar nenhum. Quem propôs o
--      match pode PATCHar status='accepted' e seguir sozinho até o checkout,
--      sem a outra parte nunca ter concordado. O app esconde os botões
--      (canRespond em src/app/matches/[id]/page.tsx), mas isso é só UI.
--
--   C. CONFIRMAÇÃO CRUZADA. traveler_confirmed_pickup e
--      requester_confirmed_dropoff são escrevíveis pelas DUAS partes. Uma parte
--      sozinha marca as duas, o match vira 'completed', os contadores de
--      entrega sobem e o fluxo de avaliação abre. As checagens de papel existem
--      só nas server actions (confirmPickup/confirmDropoff).
--
-- Abordagem: derivar em vez de validar sempre que possível. O trigger
-- sobrescreve o que o cliente mandou nos campos que o servidor é dono
-- (connection_fee, timestamps, promoção para 'completed'), e só valida de fato
-- a decisão que é genuinamente do usuário (aceitar/recusar).
--
-- Segue o padrão estabelecido em 0008: SECURITY INVOKER + current_user, porque
-- dentro de uma função SECURITY DEFINER o current_user vira o dono da função
-- (postgres) e a checagem nunca casaria — o trigger ficaria morto em silêncio.

-- ===========================================================================
-- 1. Fórmula da taxa de conexão, única fonte da verdade
-- ===========================================================================

-- Espelha src/app/matches/actions.ts (calculateConnectionFee). A app pode
-- continuar calculando por conta própria para exibir o valor antes de gravar;
-- o que vale é o que este função devolve na hora do INSERT.
CREATE OR REPLACE FUNCTION public.calc_connection_fee(p_order_id UUID)
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

REVOKE ALL ON FUNCTION public.calc_connection_fee(UUID) FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- 2. INSERT: o cliente não escolhe preço, status nem autoria
-- ===========================================================================

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

  -- Resolvido uma vez. Comparar auth.uid() direto num NOT IN seria armadilha:
  -- com uid nulo a expressão dá NULL, o IF trata NULL como falso e a checagem
  -- passa batido.
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

  -- A RLS já exige isso, mas repetir aqui mantém o trigger correto mesmo se a
  -- policy for reescrita mais frouxa no futuro.
  IF v_uid NOT IN (v_traveler_id, v_requester_id) THEN
    RAISE EXCEPTION 'só as partes envolvidas podem propor um match';
  END IF;

  -- Ninguém propõe match consigo mesmo.
  IF v_traveler_id = v_requester_id THEN
    RAISE EXCEPTION 'viagem e pedido pertencem à mesma pessoa';
  END IF;

  v_fee := public.calc_connection_fee(NEW.order_id);
  IF v_fee IS NULL THEN
    RAISE EXCEPTION 'não foi possível calcular a taxa de conexão';
  END IF;

  -- Campos que o servidor é dono: o que veio do cliente é descartado.
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

DROP TRIGGER IF EXISTS trg_guard_match_insert ON public.matches;
CREATE TRIGGER trg_guard_match_insert
  BEFORE INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_match_insert();

-- ===========================================================================
-- 3. UPDATE: máquina de estados, com cada coluna amarrada a um papel
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.guard_match_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_traveler_id      UUID;
  v_requester_id     UUID;
  v_uid              UUID;
  v_is_traveler      BOOLEAN;
  v_is_requester     BOOLEAN;
  v_requested_status TEXT;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  v_uid := (SELECT auth.uid());

  SELECT t.traveler_id, o.requester_id
    INTO v_traveler_id, v_requester_id
  FROM public.trips t, public.orders o
  WHERE t.id = OLD.trip_id AND o.id = OLD.order_id;

  v_is_traveler  := v_uid IS NOT NULL AND v_uid = v_traveler_id;
  v_is_requester := v_uid IS NOT NULL AND v_uid = v_requester_id;

  IF NOT (v_is_traveler OR v_is_requester) THEN
    RAISE EXCEPTION 'só as partes do match podem alterá-lo';
  END IF;

  -- --- Colunas de identidade: imutáveis -----------------------------------
  IF NEW.trip_id    IS DISTINCT FROM OLD.trip_id
  OR NEW.order_id   IS DISTINCT FROM OLD.order_id
  OR NEW.created_by IS DISTINCT FROM OLD.created_by
  OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'trip_id, order_id, created_by e created_at são imutáveis';
  END IF;

  -- connection_fee também é coberto pelo trg_guard_unlock_fields; repetido
  -- aqui para este trigger continuar suficiente se aquele for removido.
  IF NEW.connection_fee IS DISTINCT FROM OLD.connection_fee THEN
    RAISE EXCEPTION 'a taxa de conexão é definida na criação do match';
  END IF;

  -- --- Confirmação de coleta: só o viajante, e só uma vez ------------------
  IF NEW.traveler_confirmed_pickup IS DISTINCT FROM OLD.traveler_confirmed_pickup THEN
    IF NOT v_is_traveler THEN
      RAISE EXCEPTION 'só o viajante confirma a coleta';
    END IF;
    IF COALESCE(OLD.traveler_confirmed_pickup, FALSE) THEN
      RAISE EXCEPTION 'a coleta já foi confirmada';
    END IF;
    IF NOT COALESCE(NEW.traveler_confirmed_pickup, FALSE) THEN
      RAISE EXCEPTION 'a confirmação de coleta não pode ser desfeita';
    END IF;
    IF OLD.status <> 'accepted' THEN
      RAISE EXCEPTION 'o match precisa estar aceito para confirmar a coleta';
    END IF;
    NEW.traveler_confirmed_pickup_at := now();
  ELSE
    NEW.traveler_confirmed_pickup_at := OLD.traveler_confirmed_pickup_at;
  END IF;

  -- --- Confirmação de entrega: só o destinatário, e só uma vez -------------
  IF NEW.requester_confirmed_dropoff IS DISTINCT FROM OLD.requester_confirmed_dropoff THEN
    IF NOT v_is_requester THEN
      RAISE EXCEPTION 'só o destinatário confirma o recebimento';
    END IF;
    IF COALESCE(OLD.requester_confirmed_dropoff, FALSE) THEN
      RAISE EXCEPTION 'o recebimento já foi confirmado';
    END IF;
    IF NOT COALESCE(NEW.requester_confirmed_dropoff, FALSE) THEN
      RAISE EXCEPTION 'a confirmação de recebimento não pode ser desfeita';
    END IF;
    IF OLD.status <> 'accepted' THEN
      RAISE EXCEPTION 'o match precisa estar aceito para confirmar o recebimento';
    END IF;
    NEW.requester_confirmed_dropoff_at := now();
  ELSE
    NEW.requester_confirmed_dropoff_at := OLD.requester_confirmed_dropoff_at;
  END IF;

  -- --- Status ---------------------------------------------------------------
  -- Guarda o que o cliente pediu e volta o campo para o valor antigo: a partir
  -- daqui só este bloco decide o status.
  v_requested_status := NEW.status;
  NEW.status         := OLD.status;
  NEW.accepted_at    := OLD.accepted_at;
  NEW.completed_at   := OLD.completed_at;

  IF OLD.status = 'pending' THEN
    IF v_requested_status IN ('accepted', 'declined') THEN
      -- É isto que impede o auto-aceite: responder é ato de quem recebeu a
      -- proposta, não de quem a fez.
      IF v_uid = OLD.created_by THEN
        RAISE EXCEPTION 'quem propôs o match não pode responder à própria proposta';
      END IF;
      NEW.status := v_requested_status;
      IF v_requested_status = 'accepted' THEN
        NEW.accepted_at := now();
      END IF;
    ELSIF v_requested_status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'transição de status inválida: % -> %', OLD.status, v_requested_status;
    END IF;

  ELSIF OLD.status = 'accepted' THEN
    -- 'completed' é derivado logo abaixo; pedir explicitamente é tolerado e
    -- ignorado, porque a app manda status junto com a confirmação de entrega.
    IF v_requested_status NOT IN ('accepted', 'completed') THEN
      RAISE EXCEPTION 'transição de status inválida: % -> %', OLD.status, v_requested_status;
    END IF;

  ELSE
    -- completed / declined são terminais.
    IF v_requested_status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'match % não pode mudar de status', OLD.status;
    END IF;
  END IF;

  -- Conclusão é consequência das duas confirmações, nunca um pedido do cliente.
  IF NEW.status = 'accepted'
     AND COALESCE(NEW.traveler_confirmed_pickup, FALSE)
     AND COALESCE(NEW.requester_confirmed_dropoff, FALSE) THEN
    NEW.status       := 'completed';
    NEW.completed_at := now();
  END IF;

  -- --- Motivo da recusa: só no ato de recusar --------------------------------
  -- Não basta exigir status='declined': isso deixaria o texto editável para
  -- sempre depois da recusa. Só vale durante a própria transição.
  IF NEW.declined_reason IS DISTINCT FROM OLD.declined_reason
     AND NOT (NEW.status = 'declined' AND OLD.status <> 'declined') THEN
    RAISE EXCEPTION 'declined_reason só pode ser preenchido no ato da recusa';
  END IF;

  -- --- Preço combinado: qualquer parte, enquanto o match estiver vivo -------
  IF NEW.agreed_price IS DISTINCT FROM OLD.agreed_price THEN
    IF NEW.status NOT IN ('pending', 'accepted') THEN
      RAISE EXCEPTION 'o preço combinado não pode mudar num match %', NEW.status;
    END IF;
    IF NEW.agreed_price IS NOT NULL AND NEW.agreed_price < 0 THEN
      RAISE EXCEPTION 'preço combinado inválido';
    END IF;
  END IF;

  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_match_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_match_update ON public.matches;
CREATE TRIGGER trg_guard_match_update
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_match_update();

-- ===========================================================================
-- 4. WITH CHECK explícito na policy de UPDATE
-- ===========================================================================
-- Sem WITH CHECK o Postgres reaproveita o USING, o que já basta hoje. Declarar
-- deixa a intenção explícita e evita que uma reescrita futura do USING abra a
-- linha resultante sem querer.
DROP POLICY IF EXISTS "Match participants can update their matches" ON public.matches;
CREATE POLICY "Match participants can update their matches" ON public.matches
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = (SELECT traveler_id FROM public.trips WHERE id = matches.trip_id)
    OR (SELECT auth.uid()) = (SELECT requester_id FROM public.orders WHERE id = matches.order_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) = (SELECT traveler_id FROM public.trips WHERE id = matches.trip_id)
    OR (SELECT auth.uid()) = (SELECT requester_id FROM public.orders WHERE id = matches.order_id)
  );

-- ===========================================================================
-- 5. Reparo no gatilho de estatísticas da 0008
-- ===========================================================================
-- A 0008 declara `AFTER UPDATE OF status`. No Postgres, `UPDATE OF col` dispara
-- quando a coluna aparece na lista SET do comando — não quando o valor muda.
-- Como agora quem promove para 'completed' é o trigger BEFORE acima, o SET do
-- cliente pode não citar `status` e a 0008 nunca rodaria.
--
-- Acontece de verdade: confirmDropoff (src/app/matches/actions.ts) só manda
-- status quando a coleta já está confirmada. Se a ordem se inverter — a pessoa
-- confirma o recebimento antes de o viajante confirmar a coleta — quem fecha o
-- match é o UPDATE do confirmPickup, que manda só traveler_confirmed_pickup.
-- Aí trips_completed/orders_completed ficariam parados para os dois lados.
--
-- Correção: mesmo trigger sem o `OF status`. A cláusula WHEN continua fazendo o
-- filtro, e ela enxerga o NEW já reescrito pelos triggers BEFORE.
--
-- Envolvido num DO para esta migration continuar aplicável sozinha caso a 0008
-- ainda não tenha sido aprovada. Ordem pretendida: 0008 e depois 0009.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_match_completed'
  ) THEN
    DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
    CREATE TRIGGER on_match_completed
      AFTER UPDATE ON public.matches
      FOR EACH ROW
      WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
      EXECUTE FUNCTION public.handle_match_completed();
  ELSE
    RAISE NOTICE 'handle_match_completed ausente — aplique a migration 0008 antes desta.';
  END IF;
END
$$;

-- ===========================================================================
-- 6. Correção de dados: taxas fora da faixa possível
-- ===========================================================================
-- Se alguém já explorou (A), a linha carrega uma taxa que a fórmula nunca
-- produziria. Recalcula essas — só as ainda não desbloqueadas, para não mexer
-- em match já pago.
UPDATE public.matches m
SET connection_fee = public.calc_connection_fee(m.order_id)
WHERE m.unlocked_at IS NULL
  AND (
    m.connection_fee IS NULL
    OR m.connection_fee < 4.90
    OR m.connection_fee > 29.90
    OR m.connection_fee IS DISTINCT FROM public.calc_connection_fee(m.order_id)
  );
