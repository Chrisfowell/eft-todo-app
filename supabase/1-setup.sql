-- EFT To-Do: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run. Run it once.

-- People who use the app (one row per login)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

-- Shared contacts book
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Tasks. section = 'work' (shared with the team) or 'personal' (private to the owner)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  section text not null default 'work' check (section in ('work', 'personal')),
  owner uuid references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  type text not null default 'other'
    check (type in ('quote','ce','fault','install','service','survey','meeting','other')),
  job text not null default '',
  due date,
  due_time text not null default '',
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  notes text not null default '',
  contact_id uuid references public.contacts (id) on delete set null,
  assignees uuid[] not null default '{}',
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tasks_section_idx on public.tasks (section, done);
create index if not exists tasks_owner_idx on public.tasks (owner);

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security: only signed-in people can see anything
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "profiles readable by team" on public.profiles;
create policy "profiles readable by team" on public.profiles
  for select to authenticated using (true);
drop policy if exists "edit own profile" on public.profiles;
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "contacts shared with team" on public.contacts;
create policy "contacts shared with team" on public.contacts
  for all to authenticated using (true) with check (true);

-- Work tasks: everyone signed in can see and update them. Personal tasks: owner only.
drop policy if exists "read tasks" on public.tasks;
create policy "read tasks" on public.tasks
  for select to authenticated
  using (section = 'work' or owner = auth.uid());
drop policy if exists "add tasks" on public.tasks;
create policy "add tasks" on public.tasks
  for insert to authenticated
  with check (owner = auth.uid() or section = 'work');
drop policy if exists "update tasks" on public.tasks;
create policy "update tasks" on public.tasks
  for update to authenticated
  using (section = 'work' or owner = auth.uid())
  with check (section = 'work' or owner = auth.uid());
drop policy if exists "delete tasks" on public.tasks;
create policy "delete tasks" on public.tasks
  for delete to authenticated
  using (section = 'work' or owner = auth.uid());

-- Live updates between phones
do $$
begin
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.contacts; exception when duplicate_object then null; end;
end $$;
