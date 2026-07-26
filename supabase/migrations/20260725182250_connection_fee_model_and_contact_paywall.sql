-- ============================================
-- 1. MATCHES: vira o registro de "conexão"
-- ============================================
alter table public.matches
  add column if not exists connection_fee numeric,
  add column if not exists unlocked_at timestamptz,
  add column if not exists unlocked_by uuid references public.profiles(id);

create index if not exists idx_matches_unlocked on public.matches(unlocked_at) where unlocked_at is not null;

-- ============================================
-- 2. PAYMENTS: generaliza para taxa de conexão
--    (payee vira a plataforma => nullable)
-- ============================================
alter table public.payments
  add column if not exists kind text not null default 'connection_fee',
  add column if not exists psp text,
  add column if not exists psp_charge_id text,
  add column if not exists pix_qr_payload text,
  add column if not exists pix_expires_at timestamptz;

alter table public.payments
  alter column payee_id drop not null,
  alter column amount_to_traveler set default 0,
  alter column amount_to_traveler drop not null;

do $$ begin
  alter table public.payments
    add constraint payments_kind_check
    check (kind in ('connection_fee','delivery_escrow'));
exception when duplicate_object then null; end $$;

create unique index if not exists idx_payments_psp_charge on public.payments(psp_charge_id) where psp_charge_id is not null;

-- ============================================
-- 3. FECHA O VAZAMENTO DE CONTATO
-- ============================================
drop policy if exists "Profiles are publicly readable" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- View pública SEM telefone: é o que a listagem/busca deve consumir
create or replace view public.profiles_public
with (security_invoker = off) as
select id, full_name, avatar_url, bio, avg_rating, total_reviews,
       kyc_verified, trips_completed, orders_completed, created_at
from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- ============================================
-- 4. CONTATO SÓ APÓS PAGAMENTO
-- ============================================
create or replace function public.get_unlocked_contact(p_match_id uuid)
returns table (user_id uuid, full_name text, phone text)
language sql security definer stable set search_path = public
as $$
  select p.id, p.full_name, p.phone
  from public.matches m
  join public.trips  t on t.id = m.trip_id
  join public.orders o on o.id = m.order_id
  join public.profiles p
    on p.id = case when auth.uid() = t.traveler_id
                   then o.requester_id else t.traveler_id end
  where m.id = p_match_id
    and m.unlocked_at is not null
    and auth.uid() in (t.traveler_id, o.requester_id);
$$;

revoke all on function public.get_unlocked_contact(uuid) from public, anon;
grant execute on function public.get_unlocked_contact(uuid) to authenticated;

-- ============================================
-- 5. CHAT SÓ APÓS PAGAMENTO
--    (chat livre = troca de WhatsApp = fee burlada)
-- ============================================
drop policy if exists "Match participants can view messages" on public.messages;
drop policy if exists "Match participants can send messages" on public.messages;

create policy "Unlocked match participants can view messages"
  on public.messages for select
  using (exists (
    select 1 from public.matches m
    join public.trips  t on t.id = m.trip_id
    join public.orders o on o.id = m.order_id
    where m.id = messages.match_id
      and m.unlocked_at is not null
      and auth.uid() in (t.traveler_id, o.requester_id)
  ));

create policy "Unlocked match participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      join public.trips  t on t.id = m.trip_id
      join public.orders o on o.id = m.order_id
      where m.id = messages.match_id
        and m.unlocked_at is not null
        and auth.uid() in (t.traveler_id, o.requester_id)
    )
  );
