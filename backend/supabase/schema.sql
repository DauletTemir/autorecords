-- AutoRecords schema: groups (organizations), members, vehicles, service history.
-- Run once in the Supabase SQL Editor on a fresh project.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
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

-- organizations: a user can see/update a group only if they're a member
create policy "select own groups" on organizations
  for select using (
    id in (select org_id from org_members where user_id = auth.uid())
  );

create policy "update own groups" on organizations
  for update using (
    id in (select org_id from org_members where user_id = auth.uid())
  );

-- organizations: any authenticated user can create a new group (signup flow)
create policy "create groups" on organizations
  for insert with check (auth.uid() is not null);

-- org_members: members can see who else is in their groups
create policy "select own membership rows" on org_members
  for select using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

-- org_members: a user can insert themselves into a group they just created
create policy "insert own membership" on org_members
  for insert with check (user_id = auth.uid());

-- vehicles: full access if the caller belongs to the vehicle's group
create policy "manage vehicles in own groups" on vehicles
  for all using (
    org_id in (select org_id from org_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from org_members where user_id = auth.uid())
  );

-- service_entries: full access if the caller belongs to the parent vehicle's group
create policy "manage entries in own groups" on service_entries
  for all using (
    vehicle_id in (
      select v.id from vehicles v
      join org_members m on m.org_id = v.org_id
      where m.user_id = auth.uid()
    )
  ) with check (
    vehicle_id in (
      select v.id from vehicles v
      join org_members m on m.org_id = v.org_id
      where m.user_id = auth.uid()
    )
  );
