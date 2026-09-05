create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  opted_in boolean := coalesce((new.raw_user_meta_data ->> 'marketing_consent') = 'true', false);
begin
  insert into public.profiles (id, marketing_consent, marketing_consented_at)
  values (new.id, opted_in, case when opted_in then now() else null end)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

