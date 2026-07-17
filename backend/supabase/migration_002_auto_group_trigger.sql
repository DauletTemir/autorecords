-- Adds the atomic default-group-on-signup trigger without touching existing data.
-- Safe to run on a project that already has data (unlike reset.sql + schema.sql).

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

-- Must only ever run via the trigger above — a security definer function is
-- otherwise directly callable by any role (even anonymous) through PostgREST's
-- auto-exposed /rest/v1/rpc/<function_name> endpoint.
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function my_org_ids() from public, anon;
