
-- Indexes for unindexed foreign keys
create index if not exists matches_created_by_idx on public.matches (created_by);
create index if not exists matches_order_id_idx on public.matches (order_id);
create index if not exists messages_match_id_idx on public.messages (match_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists orders_requester_id_idx on public.orders (requester_id);
create index if not exists trips_traveler_id_idx on public.trips (traveler_id);

-- Wrap auth.uid() calls in (select ...) so Postgres evaluates them once per
-- statement instead of once per row (RLS initplan optimization).

-- profiles
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using ((select auth.uid()) = id);

-- trips
drop policy if exists "Travelers can insert their own trips" on public.trips;
create policy "Travelers can insert their own trips" on public.trips
  for insert with check ((select auth.uid()) = traveler_id);

drop policy if exists "Travelers can update their own trips" on public.trips;
create policy "Travelers can update their own trips" on public.trips
  for update using ((select auth.uid()) = traveler_id);

drop policy if exists "Travelers can delete their own trips" on public.trips;
create policy "Travelers can delete their own trips" on public.trips
  for delete using ((select auth.uid()) = traveler_id);

-- orders
drop policy if exists "Requesters can insert their own orders" on public.orders;
create policy "Requesters can insert their own orders" on public.orders
  for insert with check ((select auth.uid()) = requester_id);

drop policy if exists "Requesters can update their own orders" on public.orders;
create policy "Requesters can update their own orders" on public.orders
  for update using ((select auth.uid()) = requester_id);

drop policy if exists "Requesters can delete their own orders" on public.orders;
create policy "Requesters can delete their own orders" on public.orders
  for delete using ((select auth.uid()) = requester_id);

-- matches
drop policy if exists "Match participants can view their matches" on public.matches;
create policy "Match participants can view their matches" on public.matches
  for select using (
    (select auth.uid()) = (select traveler_id from public.trips where id = matches.trip_id)
    or (select auth.uid()) = (select requester_id from public.orders where id = matches.order_id)
  );

drop policy if exists "Match participants can create matches" on public.matches;
create policy "Match participants can create matches" on public.matches
  for insert with check (
    (select auth.uid()) = (select traveler_id from public.trips where id = matches.trip_id)
    or (select auth.uid()) = (select requester_id from public.orders where id = matches.order_id)
  );

drop policy if exists "Match participants can update their matches" on public.matches;
create policy "Match participants can update their matches" on public.matches
  for update using (
    (select auth.uid()) = (select traveler_id from public.trips where id = matches.trip_id)
    or (select auth.uid()) = (select requester_id from public.orders where id = matches.order_id)
  );

-- messages
drop policy if exists "Match participants can view messages" on public.messages;
create policy "Match participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      join public.trips t on t.id = m.trip_id
      join public.orders o on o.id = m.order_id
      where m.id = messages.match_id
        and ((select auth.uid()) = t.traveler_id or (select auth.uid()) = o.requester_id)
    )
  );

drop policy if exists "Match participants can send messages" on public.messages;
create policy "Match participants can send messages" on public.messages
  for insert with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.matches m
      join public.trips t on t.id = m.trip_id
      join public.orders o on o.id = m.order_id
      where m.id = messages.match_id
        and ((select auth.uid()) = t.traveler_id or (select auth.uid()) = o.requester_id)
    )
  );
