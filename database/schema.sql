-- ============================================================================
-- GearTrack / Bike Logbook Telemetry — PostgreSQL & Supabase RLS Schema
-- Auto-migrasi lengkap seluruh kolom dari skema versi lama + RLS Policies
-- ============================================================================

create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. Tabel: public.bikes
-- ----------------------------------------------------------------------------
create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Unnamed Bike' check (char_length(trim(name)) > 0),
  brand_model text not null default '',
  total_odometer_km numeric(10, 2) not null default 0 check (total_odometer_km >= 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bikes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text not null default 'Unnamed Bike',
  add column if not exists brand_model text not null default '',
  add column if not exists total_odometer_km numeric(10, 2) not null default 0,
  add column if not exists is_archived boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 2. Tabel: public.components
-- ----------------------------------------------------------------------------
create table if not exists public.components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  bike_id uuid references public.bikes(id) on delete cascade,
  name text not null default 'Component' check (char_length(trim(name)) > 0),
  category text not null default 'Service' check (char_length(trim(category)) > 0),
  installed_odometer_km numeric(10, 2) not null default 0 check (installed_odometer_km >= 0),
  lifespan_km numeric(10, 2) not null default 3000 check (lifespan_km > 0),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.components
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists bike_id uuid references public.bikes(id) on delete cascade,
  add column if not exists name text not null default 'Component',
  add column if not exists category text not null default 'Service',
  add column if not exists installed_odometer_km numeric(10, 2) not null default 0,
  add column if not exists lifespan_km numeric(10, 2) not null default 3000,
  add column if not exists is_archived boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 3. Tabel: public.activities
-- ----------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  bike_id uuid references public.bikes(id) on delete cascade,
  strava_activity_id bigint unique,
  title text not null default 'Ride Activity' check (char_length(trim(title)) > 0),
  date date not null default current_date,
  distance_km numeric(10, 2) not null default 0 check (distance_km >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  elevation_gain_m integer not null default 0 check (elevation_gain_m >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.activities
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists bike_id uuid references public.bikes(id) on delete cascade,
  add column if not exists strava_activity_id bigint,
  add column if not exists title text not null default 'Ride Activity',
  add column if not exists date date not null default current_date,
  add column if not exists distance_km numeric(10, 2) not null default 0,
  add column if not exists duration_minutes integer not null default 0,
  add column if not exists elevation_gain_m integer not null default 0,
  add column if not exists notes text not null default '',
  add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 4. Tabel: public.ledger_entries
-- ----------------------------------------------------------------------------
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  bike_id uuid references public.bikes(id) on delete cascade,
  title text not null default 'Maintenance Entry' check (char_length(trim(title)) > 0),
  category text not null default 'Service' check (char_length(trim(category)) > 0),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  date date not null default current_date,
  distance_km numeric(10, 2) check (distance_km is null or distance_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ledger_entries
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists bike_id uuid references public.bikes(id) on delete cascade,
  add column if not exists title text not null default 'Maintenance Entry',
  add column if not exists category text not null default 'Service',
  add column if not exists cost numeric(12, 2) not null default 0,
  add column if not exists date date not null default current_date,
  add column if not exists distance_km numeric(10, 2),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 5. Backfill kolom lama (activity_date, service_date, user_id)
-- ----------------------------------------------------------------------------
do $$
declare
  v_owner_id uuid;
begin
  -- Salin tanggal dari kolom lama di activities jika ada (misal activity_date)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'activities' and column_name = 'activity_date'
  ) then
    execute 'update public.activities set date = activity_date::date where activity_date is not null';
  end if;

  -- Salin tanggal dari kolom lama di ledger_entries jika ada (misal service_date atau entry_date)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ledger_entries' and column_name = 'service_date'
  ) then
    execute 'update public.ledger_entries set date = service_date::date where service_date is not null';
  end if;

  -- Backfill user_id dari akun pertama di auth.users
  select id into v_owner_id from auth.users order by created_at asc limit 1;

  if v_owner_id is not null then
    update public.bikes set user_id = v_owner_id where user_id is null;

    update public.components c
      set user_id = coalesce(b.user_id, v_owner_id)
      from public.bikes b
      where c.bike_id = b.id and c.user_id is null;
    update public.components set user_id = v_owner_id where user_id is null;

    update public.activities a
      set user_id = coalesce(b.user_id, v_owner_id)
      from public.bikes b
      where a.bike_id = b.id and a.user_id is null;
    update public.activities set user_id = v_owner_id where user_id is null;

    update public.ledger_entries l
      set user_id = coalesce(b.user_id, v_owner_id)
      from public.bikes b
      where l.bike_id = b.id and l.user_id is null;
    update public.ledger_entries set user_id = v_owner_id where user_id is null;
  end if;

  if not exists (select 1 from public.bikes where user_id is null) then
    alter table public.bikes alter column user_id set not null;
  end if;
  if not exists (select 1 from public.components where user_id is null) then
    alter table public.components alter column user_id set not null;
  end if;
  if not exists (select 1 from public.activities where user_id is null) then
    alter table public.activities alter column user_id set not null;
  end if;
  if not exists (select 1 from public.ledger_entries where user_id is null) then
    alter table public.ledger_entries alter column user_id set not null;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Indeks & Triggers
-- ----------------------------------------------------------------------------
create index if not exists idx_bikes_user_order
  on public.bikes (user_id, is_archived asc, created_at asc);

drop trigger if exists trg_bikes_updated_at on public.bikes;
create trigger trg_bikes_updated_at
  before update on public.bikes
  for each row execute function public.handle_updated_at();

create index if not exists idx_components_user_created
  on public.components (user_id, created_at desc);

create index if not exists idx_components_bike_id
  on public.components (bike_id);

drop trigger if exists trg_components_updated_at on public.components;
create trigger trg_components_updated_at
  before update on public.components
  for each row execute function public.handle_updated_at();

create index if not exists idx_activities_user_date
  on public.activities (user_id, date desc);

create index if not exists idx_activities_bike_id
  on public.activities (bike_id);

create index if not exists idx_ledger_user_date
  on public.ledger_entries (user_id, date desc);

create index if not exists idx_ledger_bike_id
  on public.ledger_entries (bike_id);

drop trigger if exists trg_ledger_entries_updated_at on public.ledger_entries;
create trigger trg_ledger_entries_updated_at
  before update on public.ledger_entries
  for each row execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Row Level Security (RLS) & Policies
-- ----------------------------------------------------------------------------
alter table public.bikes enable row level security;
alter table public.components enable row level security;
alter table public.activities enable row level security;
alter table public.ledger_entries enable row level security;

drop policy if exists "bikes_select_own" on public.bikes;
create policy "bikes_select_own" on public.bikes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "bikes_insert_own" on public.bikes;
create policy "bikes_insert_own" on public.bikes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "bikes_update_own" on public.bikes;
create policy "bikes_update_own" on public.bikes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "bikes_delete_own" on public.bikes;
create policy "bikes_delete_own" on public.bikes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "components_select_own" on public.components;
create policy "components_select_own" on public.components for select to authenticated using (auth.uid() = user_id);
drop policy if exists "components_insert_own" on public.components;
create policy "components_insert_own" on public.components for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "components_update_own" on public.components;
create policy "components_update_own" on public.components for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "components_delete_own" on public.components;
create policy "components_delete_own" on public.components for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "activities_select_own" on public.activities;
create policy "activities_select_own" on public.activities for select to authenticated using (auth.uid() = user_id);
drop policy if exists "activities_insert_own" on public.activities;
create policy "activities_insert_own" on public.activities for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "activities_update_own" on public.activities;
create policy "activities_update_own" on public.activities for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "activities_delete_own" on public.activities;
create policy "activities_delete_own" on public.activities for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "ledger_entries_select_own" on public.ledger_entries;
create policy "ledger_entries_select_own" on public.ledger_entries for select to authenticated using (auth.uid() = user_id);
drop policy if exists "ledger_entries_insert_own" on public.ledger_entries;
create policy "ledger_entries_insert_own" on public.ledger_entries for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "ledger_entries_update_own" on public.ledger_entries;
create policy "ledger_entries_update_own" on public.ledger_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.bikes b where b.id = bike_id and b.user_id = auth.uid()));
drop policy if exists "ledger_entries_delete_own" on public.ledger_entries;
create policy "ledger_entries_delete_own" on public.ledger_entries for delete to authenticated using (auth.uid() = user_id);

create or replace function public.sync_bike_odometer_from_activities()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE' or tg_op = 'UPDATE') then
    update public.bikes
    set total_odometer_km = coalesce(
      (select sum(distance_km) from public.activities where bike_id = old.bike_id),
      0
    )
    where id = old.bike_id;
  end if;

  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    update public.bikes
    set total_odometer_km = coalesce(
      (select sum(distance_km) from public.activities where bike_id = new.bike_id),
      0
    )
    where id = new.bike_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_bike_odometer on public.activities;
create trigger trg_sync_bike_odometer
  after insert or update of distance_km, bike_id or delete on public.activities
  for each row execute function public.sync_bike_odometer_from_activities();