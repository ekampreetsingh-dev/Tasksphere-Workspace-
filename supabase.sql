-- TaskSphere private, per-user profile storage.
-- Use the public anon/publishable key in the browser; never use a service-role key.
-- Already applied to the live project; re-running is a no-op (everything is if-not-exists / or replace).
create table if not exists public.tasksphere_app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint tasksphere_app_payload_is_object check (jsonb_typeof(payload) = 'object')
);

alter table public.tasksphere_app_profiles enable row level security;
alter table public.tasksphere_app_profiles force row level security;

drop policy if exists "TaskSphere users can read their profile" on public.tasksphere_app_profiles;
create policy "TaskSphere users can read their profile"
  on public.tasksphere_app_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "TaskSphere users can create their profile" on public.tasksphere_app_profiles;
create policy "TaskSphere users can create their profile"
  on public.tasksphere_app_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "TaskSphere users can update their profile" on public.tasksphere_app_profiles;
create policy "TaskSphere users can update their profile"
  on public.tasksphere_app_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.tasksphere_app_profiles from public, anon, authenticated;
grant select, insert, update on public.tasksphere_app_profiles to authenticated;

create or replace function public.tasksphere_app_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasksphere_app_profiles_updated_at on public.tasksphere_app_profiles;
create trigger tasksphere_app_profiles_updated_at
  before update on public.tasksphere_app_profiles
  for each row execute function public.tasksphere_app_set_updated_at();

-- Realtime: the browser subscribes to this row so a write on one device lands on
-- the other in about a second instead of waiting for a focus or reload. Adding an
-- already-published table raises duplicate_object, which is the re-run case.
do $$
begin
  alter publication supabase_realtime add table public.tasksphere_app_profiles;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- Full row images, so a realtime event carries the blob the client needs.
alter table public.tasksphere_app_profiles replica identity full;

-- This project has a legacy public policy on its old tasksphere_profiles table.
-- Remove that broad policy while leaving the legacy table and its data intact.
do $$
begin
  if to_regclass('public.tasksphere_profiles') is not null then
    execute 'drop policy if exists "Allow public workspace profile access" on public.tasksphere_profiles';
  end if;
end;
$$;
