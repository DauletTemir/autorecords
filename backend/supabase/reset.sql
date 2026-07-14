-- Run this first to undo the broken (recursive) schema before re-applying schema.sql.
drop table if exists service_entries cascade;
drop table if exists vehicles cascade;
drop table if exists org_members cascade;
drop table if exists organizations cascade;
drop function if exists my_org_ids();
