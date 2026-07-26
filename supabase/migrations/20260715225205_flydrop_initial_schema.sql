-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- trips (viagens)
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  origin_city text not null,
  origin_state text,
  destination_city text not null,
  destination_state text,
  departure_date date not null,
  available_space_kg numeric,
  notes text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;

create policy "Trips are publicly readable"
  on public.trips for select
  using (true);

create policy "Travelers can insert their own trips"
  on public.trips for insert
  with check (auth.uid() = traveler_id);

create policy "Travelers can update their own trips"
  on public.trips for update
  using (auth.uid() = traveler_id);

create policy "Travelers can delete their own trips"
  on public.trips for delete
  using (auth.uid() = traveler_id);

create index trips_route_idx on public.trips (origin_city, destination_city, departure_date);

-- orders (pedidos)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  product_link text,
  description text,
  size text,
  weight_kg numeric,
  origin_city text not null,
  destination_city text not null,
  needed_by_date date,
  budget numeric,
  status text not null default 'open' check (status in ('open', 'matched', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Orders are publicly readable"
  on public.orders for select
  using (true);

create policy "Requesters can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = requester_id);

create policy "Requesters can update their own orders"
  on public.orders for update
  using (auth.uid() = requester_id);

create policy "Requesters can delete their own orders"
  on public.orders for delete
  using (auth.uid() = requester_id);

create index orders_route_idx on public.orders (origin_city, destination_city);

-- matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed')),
  agreed_price numeric,
  created_at timestamptz not null default now(),
  unique (trip_id, order_id)
);

alter table public.matches enable row level security;

create policy "Match participants can view their matches"
  on public.matches for select
  using (
    auth.uid() = (select traveler_id from public.trips where id = trip_id)
    or auth.uid() = (select requester_id from public.orders where id = order_id)
  );

create policy "Match participants can create matches"
  on public.matches for insert
  with check (
    auth.uid() = (select traveler_id from public.trips where id = trip_id)
    or auth.uid() = (select requester_id from public.orders where id = order_id)
  );

create policy "Match participants can update their matches"
  on public.matches for update
  using (
    auth.uid() = (select traveler_id from public.trips where id = trip_id)
    or auth.uid() = (select requester_id from public.orders where id = order_id)
  );

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Match participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      join public.trips t on t.id = m.trip_id
      join public.orders o on o.id = m.order_id
      where m.id = match_id
        and (auth.uid() = t.traveler_id or auth.uid() = o.requester_id)
    )
  );

create policy "Match participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      join public.trips t on t.id = m.trip_id
      join public.orders o on o.id = m.order_id
      where m.id = match_id
        and (auth.uid() = t.traveler_id or auth.uid() = o.requester_id)
    )
  );

alter publication supabase_realtime add table public.messages;
