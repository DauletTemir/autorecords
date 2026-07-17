-- AutoRecords schema: groups (organizations), members, vehicles, service history.
-- Run once in the Supabase SQL Editor on a fresh project.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table org_members (
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  role text not null default 'member',
  primary key (user_id, org_id)
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vin text not null,
  brand text, model text, year text, plate text,
  created_at timestamptz default now(),
  unique (org_id, vin)
);

create table service_entries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  date date,
  service_type text, description text, mileage text, cost numeric, comment text,
  created_at timestamptz default now()
);

-- Row Level Security -------------------------------------------------------

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table vehicles enable row level security;
alter table service_entries enable row level security;

-- security definer helper: bypasses RLS internally, so policies that need
-- "which orgs am I a member of" don't recurse into org_members' own RLS.
create or replace function my_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id from org_members where user_id = auth.uid()
$$;

-- Only the authenticated role calls this (implicitly, via RLS policies).
-- Anonymous callers have no legitimate reason to invoke it directly.
revoke execute on function my_org_ids() from public, anon;

-- organizations: visible if the caller is a member, or the row's own creator
-- (the creator clause lets INSERT ... RETURNING succeed before the matching
-- org_members row exists — Postgres RLS requires the new row to satisfy a
-- SELECT policy for RETURNING to work, see CREATE POLICY docs on RETURNING).
create policy "select own groups" on organizations
  for select to authenticated
  using (id in (select my_org_ids()) or created_by = auth.uid());

create policy "update own groups" on organizations
  for update to authenticated
  using (id in (select my_org_ids()));

-- organizations: any authenticated user can create a new group (signup flow)
create policy "create groups" on organizations
  for insert to authenticated
  with check (created_by = auth.uid());

-- org_members: members can see who else is in their groups
create policy "select own membership rows" on org_members
  for select using (org_id in (select my_org_ids()));

-- org_members: a user can insert themselves into a group they just created
create policy "insert own membership" on org_members
  for insert with check (user_id = auth.uid());

-- vehicles: full access if the caller belongs to the vehicle's group
create policy "manage vehicles in own groups" on vehicles
  for all using (org_id in (select my_org_ids()))
  with check (org_id in (select my_org_ids()));

-- service_entries: full access if the caller belongs to the parent vehicle's group
create policy "manage entries in own groups" on service_entries
  for all using (
    vehicle_id in (select id from vehicles where org_id in (select my_org_ids()))
  ) with check (
    vehicle_id in (select id from vehicles where org_id in (select my_org_ids()))
  );

-- Auto-create a default group for every new user, atomically, at the
-- database level. This replaces client-side "check then create" logic,
-- which race-conditions into duplicate groups when two pages mount at once.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, created_by)
  values ('Гараж', new.id)
  returning id into new_org_id;

  insert into org_members (user_id, org_id, role)
  values (new.id, new_org_id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Must only ever run via the trigger above — direct RPC calls would let
-- anyone spam-create groups (public.rpc/handle_new_user is otherwise
-- reachable by any role, authenticated or not).
revoke execute on function handle_new_user() from public, anon, authenticated;
