create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  marketing_consent boolean not null default false,
  marketing_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null default 'primary' check (slot ~ '^[a-z0-9_-]{1,24}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

create table public.career_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed text not null check (char_length(seed) between 1 and 80),
  player_name text not null check (char_length(player_name) between 1 and 40),
  final_note smallint not null check (final_note between 0 and 100),
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  completed_at timestamptz not null default now()
);

create index career_results_user_completed_idx
  on public.career_results (user_id, completed_at desc);

alter table public.profiles enable row level security;
alter table public.career_saves enable row level security;
alter table public.career_results enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "career_saves_select_own"
  on public.career_saves for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "career_saves_insert_own"
  on public.career_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "career_saves_update_own"
  on public.career_saves for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "career_saves_delete_own"
  on public.career_saves for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "career_results_select_own"
  on public.career_results for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "career_results_insert_own"
  on public.career_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.career_saves, public.career_results from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.career_saves to authenticated;
grant select, insert on public.career_results to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger career_saves_set_updated_at
before update on public.career_saves
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opted_in boolean := coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false);
begin
  insert into public.profiles (id, marketing_consent, marketing_consented_at)
  values (new.id, opted_in, case when opted_in then now() else null end)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

