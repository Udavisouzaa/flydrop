-- Migration 0014: rota deixa de ser texto livre e passa a ser aeroporto
-- Aplicada em 31/07/2026 sob a versão 20260731185919.
--
-- `trips.origin_city` e `orders.origin_city` eram texto digitado pelo usuário.
-- A prova de que isso não se sustenta estava nos próprios dados: as 9 linhas em
-- produção continham "florianopolis", "floripa", "Florianópolis", "congonhas",
-- "cgh" e "São Paulo" — seis grafias para três lugares. O módulo
-- `src/lib/utils/cities.ts` existia para remendar isso em memória; com a rota
-- num domínio fechado ele deixou de ter função e foi removido.
--
-- A operação atende Florianópolis e os destinos com voo direto a partir dela.
-- A lista precisa ser idêntica à de `src/lib/airports.ts`.
--
-- ORDEM DE DEPLOY — esta migration é compatível com o código que está no ar.
-- Ela só acrescenta colunas e tabela; nada existente muda de tipo ou some. As
-- colunas antigas `*_city` continuam sendo escritas e lidas até a fase
-- seguinte removê-las. Pode ser aplicada antes ou depois do deploy.

-- ---------------------------------------------------------------------------
-- 1. Tabela de referência
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.airports (
  code        TEXT PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL CHECK (length(state) = 2),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.airports IS
  'Aeroportos atendidos. Desativar (active = false) preserva as rotas já '
  'gravadas; remover a linha quebraria a chave estrangeira, então prefira '
  'desativar.';

INSERT INTO public.airports (code, name, city, state, sort_order) VALUES
  ('FLN', 'Hercílio Luz',  'Florianópolis',  'SC', 0),
  ('GRU', 'Guarulhos',     'São Paulo',      'SP', 1),
  ('CGH', 'Congonhas',     'São Paulo',      'SP', 2),
  ('SDU', 'Santos Dumont', 'Rio de Janeiro', 'RJ', 3),
  ('GIG', 'Galeão',        'Rio de Janeiro', 'RJ', 4),
  ('BSB', 'Brasília',      'Brasília',       'DF', 5),
  ('CNF', 'Confins',       'Belo Horizonte', 'MG', 6),
  ('POA', 'Salgado Filho', 'Porto Alegre',   'RS', 7),
  ('CWB', 'Afonso Pena',   'Curitiba',       'PR', 8)
ON CONFLICT (code) DO NOTHING;

-- Dado de referência público: qualquer visitante precisa ler para montar o
-- seletor, e ninguém logado pode escrever. Só o service_role altera a lista,
-- e mesmo ele por migration.
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read airports" ON public.airports;
CREATE POLICY "Anyone can read airports"
  ON public.airports FOR SELECT
  TO anon, authenticated
  USING (TRUE);

REVOKE ALL ON TABLE public.airports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.airports TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Colunas de rota
-- ---------------------------------------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS origin_airport      TEXT REFERENCES public.airports(code),
  ADD COLUMN IF NOT EXISTS destination_airport TEXT REFERENCES public.airports(code);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS origin_airport      TEXT REFERENCES public.airports(code),
  ADD COLUMN IF NOT EXISTS destination_airport TEXT REFERENCES public.airports(code);

-- ---------------------------------------------------------------------------
-- 3. Backfill do que existe hoje
-- ---------------------------------------------------------------------------
--
-- Só converte o que é inequívoco. "São Paulo" fica NULL de propósito: a cidade
-- tem dois aeroportos e escolher um seria inventar dado que o usuário nunca
-- informou. Essas linhas ficam sem rota e não aparecem nas listagens, que
-- passam a exigir `origin_airport IS NOT NULL`.

-- Sem unaccent: a extensão não está instalada e só duas grafias têm acento,
-- então as formas acentuadas entram como literal na própria lista. Sem função
-- auxiliar tampouco — CASE repetido é mais verboso e é o que se quer aqui:
-- uma migration não deveria depender de nada além de SQL básico.

UPDATE public.trips SET
  origin_airport = CASE lower(btrim(origin_city))
    WHEN 'florianopolis' THEN 'FLN' WHEN 'florianópolis' THEN 'FLN'
    WHEN 'floripa'       THEN 'FLN' WHEN 'fln'           THEN 'FLN'
    WHEN 'congonhas'     THEN 'CGH' WHEN 'cgh'           THEN 'CGH'
    WHEN 'guarulhos'     THEN 'GRU' WHEN 'gru'           THEN 'GRU'
  END,
  destination_airport = CASE lower(btrim(destination_city))
    WHEN 'florianopolis' THEN 'FLN' WHEN 'florianópolis' THEN 'FLN'
    WHEN 'floripa'       THEN 'FLN' WHEN 'fln'           THEN 'FLN'
    WHEN 'congonhas'     THEN 'CGH' WHEN 'cgh'           THEN 'CGH'
    WHEN 'guarulhos'     THEN 'GRU' WHEN 'gru'           THEN 'GRU'
  END
  WHERE origin_airport IS NULL OR destination_airport IS NULL;

UPDATE public.orders SET
  origin_airport = CASE lower(btrim(origin_city))
    WHEN 'florianopolis' THEN 'FLN' WHEN 'florianópolis' THEN 'FLN'
    WHEN 'floripa'       THEN 'FLN' WHEN 'fln'           THEN 'FLN'
    WHEN 'congonhas'     THEN 'CGH' WHEN 'cgh'           THEN 'CGH'
    WHEN 'guarulhos'     THEN 'GRU' WHEN 'gru'           THEN 'GRU'
  END,
  destination_airport = CASE lower(btrim(destination_city))
    WHEN 'florianopolis' THEN 'FLN' WHEN 'florianópolis' THEN 'FLN'
    WHEN 'floripa'       THEN 'FLN' WHEN 'fln'           THEN 'FLN'
    WHEN 'congonhas'     THEN 'CGH' WHEN 'cgh'           THEN 'CGH'
    WHEN 'guarulhos'     THEN 'GRU' WHEN 'gru'           THEN 'GRU'
  END
  WHERE origin_airport IS NULL OR destination_airport IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Restrições — NOT VALID para não invalidar as linhas legadas
-- ---------------------------------------------------------------------------
--
-- NOT VALID faz o Postgres exigir a regra em todo INSERT e UPDATE a partir de
-- agora, sem varrer o que já está gravado. É o que permite fechar a porta para
-- linhas novas sem apagar nem adivinhar as antigas.
--
-- A exigência de rota é condicionada ao status porque NOT VALID não isenta a
-- linha antiga de um UPDATE futuro: as duas viagens cujo destino era "São
-- Paulo" ficam sem aeroporto no backfill, e uma regra incondicional as
-- deixaria impossíveis de cancelar — o dono não teria como se livrar delas.
-- Encerrar uma linha legada continua permitido; ressuscitá-la sem rota, não.

ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_route_required,
  ADD CONSTRAINT trips_route_required
    CHECK (
      status IN ('completed', 'cancelled')
      OR (origin_airport IS NOT NULL AND destination_airport IS NOT NULL)
    ) NOT VALID;

-- `<>` e não `IS DISTINCT FROM`: com os dois lados nulos o segundo devolve
-- FALSE e barraria a linha legada, enquanto uma comparação que resulta em NULL
-- satisfaz o CHECK. Aqui só interessa recusar dois códigos iguais.
ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_route_distinct,
  ADD CONSTRAINT trips_route_distinct
    CHECK (origin_airport <> destination_airport) NOT VALID;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_route_required,
  ADD CONSTRAINT orders_route_required
    CHECK (
      status IN ('completed', 'cancelled')
      OR (origin_airport IS NOT NULL AND destination_airport IS NOT NULL)
    ) NOT VALID;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_route_distinct,
  ADD CONSTRAINT orders_route_distinct
    CHECK (origin_airport <> destination_airport) NOT VALID;

-- ---------------------------------------------------------------------------
-- 5. Índices
-- ---------------------------------------------------------------------------
--
-- O filtro da aba Levar deixa de rodar em memória e vira WHERE em SQL, então
-- a rota passa a ser caminho de consulta quente. Parcial em status porque a
-- listagem sempre restringe a pedidos abertos e viagens ativas.

CREATE INDEX IF NOT EXISTS orders_route_idx
  ON public.orders (origin_airport, destination_airport)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS trips_route_idx
  ON public.trips (origin_airport, destination_airport, departure_date)
  WHERE status = 'active';
