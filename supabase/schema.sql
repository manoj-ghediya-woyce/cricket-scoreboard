-- Cricket match-day database. Paste the whole file into Supabase > SQL Editor and press Run.
-- Safe to run more than once.

-- 1. Who is allowed in. Only user ids listed here can read or write anything.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
-- (No policies and no grants: nobody can read or change this table through the API.)

-- Every account that exists right now becomes an admin. Accounts created later do NOT.
insert into public.app_admins (user_id)
select id from auth.users
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Permanent squad list.
create table if not exists public.players (
  id         text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  name       text not null check (char_length(name) between 1 and 30),
  jersey     text not null default '' check (jersey ~ '^[0-9]{0,3}$'),
  created_at timestamptz not null default now()
);

-- 3. Scheduled matches with availability and teams.
create table if not exists public.matches (
  id         text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  match_at   text not null check (match_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$'),
  title      text not null default '' check (char_length(title) <= 30),
  status     jsonb not null default '{}'::jsonb
             check (jsonb_typeof(status) = 'object' and pg_column_size(status) < 20000),
  draft      jsonb not null default '{}'::jsonb
             check (jsonb_typeof(draft) = 'object' and pg_column_size(draft) < 20000),
  updated_at timestamptz not null default now()
);

-- 4. Lock both tables: row level security on, admins only.
alter table public.players enable row level security;
alter table public.matches enable row level security;

drop policy if exists "admins manage players" on public.players;
create policy "admins manage players" on public.players
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "admins manage matches" on public.matches;
create policy "admins manage matches" on public.matches
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 5. API access: signed-in users only (the policies above then allow admins only).
revoke all on public.players, public.matches, public.app_admins from anon, authenticated;
grant select, insert, update, delete on public.players, public.matches to authenticated;

-- 6. Result: should list your admin email. If it is empty, create the user under
--    Authentication > Users and run this file again.
select u.email as admin_email
from public.app_admins a
join auth.users u on u.id = a.user_id;
