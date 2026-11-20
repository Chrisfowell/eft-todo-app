-- EFT To-Do: personal Claude connector keys.
-- Paste into Supabase > SQL Editor > New query and press Run. Run it once.
-- Each person makes their own key in the app (Account > Connect to Claude).
-- Only a scrambled (hashed) copy of each key is stored, so keys can't be read back from the database.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.connector_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now()
);

-- Nobody can read this table from the app; only the connector (secret key) can.
alter table public.connector_keys enable row level security;
revoke all on public.connector_keys from anon, authenticated;
grant select on public.connector_keys to service_role;

-- Makes a new key for the signed-in person, replacing any old one, and returns it once.
create or replace function public.new_connector_key()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  k text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  k := 'eft_' || encode(gen_random_bytes(24), 'hex');
  insert into public.connector_keys (user_id, key_hash)
  values (auth.uid(), encode(digest(k, 'sha256'), 'hex'))
  on conflict (user_id) do update set key_hash = excluded.key_hash, created_at = now();
  return k;
end;
$$;

revoke all on function public.new_connector_key() from public, anon;
grant execute on function public.new_connector_key() to authenticated;

-- Lets the app show whether you already have a key, without revealing it.
create or replace function public.has_connector_key()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.connector_keys where user_id = auth.uid());
$$;

revoke all on function public.has_connector_key() from public, anon;
grant execute on function public.has_connector_key() to authenticated;
