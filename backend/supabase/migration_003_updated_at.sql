-- Adds updated_at tracking to vehicles and service_entries, so the UI can
-- show "last changed" instead of only "first created" (created_at never
-- revises after insert). A trigger keeps it accurate on every UPDATE
-- without relying on application code to remember to set it.

alter table vehicles add column updated_at timestamptz default now();
alter table service_entries add column updated_at timestamptz default now();

-- Backfill existing rows so updated_at isn't null for data written before
-- this migration.
update vehicles set updated_at = created_at where updated_at is null;
update service_entries set updated_at = created_at where updated_at is null;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicles_updated_at on vehicles;
create trigger set_vehicles_updated_at
  before update on vehicles
  for each row execute function set_updated_at();

drop trigger if exists set_service_entries_updated_at on service_entries;
create trigger set_service_entries_updated_at
  before update on service_entries
  for each row execute function set_updated_at();
