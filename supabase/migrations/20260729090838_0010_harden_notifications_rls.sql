-- Migration 0010: fechar a RLS de `notifications`
-- STATUS: APLICADA em 2026-07-29 09:08 UTC no projeto de produção (mmylufjhugbhunofqtzp).
--
-- Contexto: a 0005 criou a tabela com três policies, e duas delas estão
-- abertas. O app passou a escrever nessa tabela de verdade agora que o sino do
-- dashboard marca notificação como lida (src/app/dashboard/actions.ts), então
-- vale fechar antes que o tráfego real comece.
--
-- Furos verificáveis via PostgREST direto, sem passar pelo app:
--
--   A. INJEÇÃO DE NOTIFICAÇÃO. A policy de INSERT se chama "Users can insert
--      notifications for matches/orders/trips they participate in", mas o
--      WITH CHECK inteiro é `auth.uid() IS NOT NULL`. Ou seja: qualquer conta
--      logada pode inserir uma linha com `user_id` de QUALQUER pessoa e
--      `title`/`message` arbitrários. O dashboard renderiza esse texto como
--      novidade legítima do LevAí — é uma superfície de phishing dentro de uma
--      UI em que o usuário confia ("Sua conta será suspensa, confirme seus
--      dados"). O nome da policy sempre descreveu a intenção certa; o corpo
--      nunca a implementou.
--
--   B. SEQUESTRO DE LINHA. A policy de UPDATE tem USING mas não tem
--      WITH CHECK. USING decide quais linhas você enxerga para atualizar;
--      WITH CHECK decide como elas podem ficar depois. Sem o segundo, um
--      PATCH em `user_id` move a própria notificação para a caixa de outra
--      pessoa — o mesmo efeito de (A), por outro caminho.
--
-- Abordagem: manter o desenho atual (as duas partes de um match notificam uma
-- à outra usando a própria sessão) e amarrar a permissão ao match, que é o
-- vínculo que de fato existe entre elas. As inserções do webhook do Asaas usam
-- o service_role e continuam passando por cima de RLS, como já faziam.

-- ===========================================================================
-- 1. Predicado de participação
-- ===========================================================================

-- Responde: "eu e p_recipient somos as duas partes de p_match_id?".
--
-- SECURITY DEFINER porque a expressão de uma policy é avaliada com os
-- privilégios de quem consulta, e uma subquery em matches/trips/orders cairia
-- na RLS dessas tabelas — o resultado ficaria dependendo de outra policy, que
-- é exatamente o tipo de acoplamento que faz uma regra falhar em silêncio.
--
-- Não vaza nada: a função só devolve true quando o próprio chamador já é parte
-- do match, então ela nunca conta ao chamador algo que ele não pudesse
-- descobrir lendo o próprio match.
CREATE OR REPLACE FUNCTION public.can_notify_about_match(
  p_match_id UUID,
  p_recipient UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.trips  t ON t.id = m.trip_id
    JOIN public.orders o ON o.id = m.order_id
    WHERE m.id = p_match_id
      AND (select auth.uid()) IN (t.traveler_id, o.requester_id)
      AND p_recipient         IN (t.traveler_id, o.requester_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_notify_about_match(UUID, UUID) FROM PUBLIC, anon;
-- `authenticated` precisa de EXECUTE: a policy roda com os privilégios de quem
-- está inserindo, não com os do dono da tabela.
GRANT EXECUTE ON FUNCTION public.can_notify_about_match(UUID, UUID) TO authenticated;

-- ===========================================================================
-- 2. INSERT: só entre as duas partes de um match
-- ===========================================================================

DROP POLICY IF EXISTS
  "Users can insert notifications for matches/orders/trips they participate in"
  ON public.notifications;

-- Todos os pontos de inserção com sessão de usuário mandam relatedMatchId
-- (notifyMatchCreated, notifyMatchResponded, notifyNewMessage,
-- pickup_confirmed, dropoff_confirmed, match_completed, review_received).
-- Exigir related_match_id NOT NULL é, portanto, uma restrição sem custo hoje —
-- e é ela que dá à policy um vínculo concreto para verificar.
CREATE POLICY "Participants can notify the other party about their match"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    related_match_id IS NOT NULL
    AND public.can_notify_about_match(related_match_id, user_id)
  );

-- ===========================================================================
-- 3. UPDATE: mesma linha antes e depois
-- ===========================================================================

DROP POLICY IF EXISTS "Users can update their own notifications"
  ON public.notifications;

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ===========================================================================
-- 4. UPDATE: a única decisão do dono é "já li"
-- ===========================================================================

-- RLS não faz permissão por coluna, então o WITH CHECK acima impede mudar de
-- dono mas não impede reescrever o próprio `title`. Isso só faria o usuário
-- enganar a si mesmo, mas o alcance certo dessa policy é literalmente um bit,
-- e é barato dizer isso no banco em vez de confiar que toda server action
-- futura vai lembrar de mandar só `read`.
--
-- SECURITY INVOKER + current_user pelo mesmo motivo documentado na 0009:
-- dentro de uma função SECURITY DEFINER o current_user vira o dono da função
-- (postgres) e a checagem de service_role nunca casaria.
CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- service_role passa por cima de RLS mas NÃO por cima de trigger: webhooks e
  -- backfills precisam continuar podendo corrigir uma linha inteira.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.id               := OLD.id;
  NEW.user_id          := OLD.user_id;
  NEW.type             := OLD.type;
  NEW.title            := OLD.title;
  NEW.message          := OLD.message;
  NEW.related_match_id := OLD.related_match_id;
  NEW.related_order_id := OLD.related_order_id;
  NEW.related_trip_id  := OLD.related_trip_id;
  NEW.created_at       := OLD.created_at;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_notification_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_notification_update ON public.notifications;

CREATE TRIGGER trg_guard_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_notification_update();
