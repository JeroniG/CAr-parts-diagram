begin;
alter table vehicle_configuration add column steering_side text check(steering_side in ('left','right'));
alter table vehicle_configuration add column vin_conditions text;
alter table vehicle_configuration add column equipment_restrictions text[] not null default '{}';
-- Catalog definitions may be shared by many physical instances.
create table part_definition (
 id text primary key, name text not null, description text not null,
 source_ids text[] not null, identity_status text not null check(identity_status in ('unverified','source-backed'))
);
create table part_instance (
 id text primary key, definition_id text not null references part_definition(id),
 vehicle_config_id text not null references vehicle_configuration(id), parent_assembly_id text,
 side text not null check(side in ('left','right','center')), assembled_transform jsonb,
 foreign key(id,vehicle_config_id) references component(id,vehicle_config_id),
 foreign key(parent_assembly_id,vehicle_config_id) references component(id,vehicle_config_id)
);
create index part_instance_definition_idx on part_instance(definition_id);
-- Immutable content versions; a registry entry points to a complete reviewed version.
create table vehicle_package_version (
 vehicle_config_id text not null references vehicle_configuration(id), revision text not null,
 manifest_url text not null, manifest_hash text not null check(manifest_hash ~ '^[0-9a-f]{64}$'),
 manifest jsonb not null, published_at timestamptz not null,
 primary key(vehicle_config_id,revision)
);
create table vehicle_registry (
 vehicle_config_id text primary key references vehicle_configuration(id), revision text not null,
 foreign key(vehicle_config_id,revision) references vehicle_package_version(vehicle_config_id,revision)
);
-- Import job details can contain local filesystem paths; do not expose them publicly.
create table vehicle_import_job (
 id text primary key, vehicle_config_id text not null references vehicle_configuration(id), revision text not null,
 status text not null check(status in ('validating','validated','published','failed')),
 report jsonb not null, updated_at timestamptz not null default now()
);
alter table vehicle_import_job enable row level security;
do $$ declare tab text; begin
 foreach tab in array array['part_definition','part_instance','vehicle_package_version','vehicle_registry'] loop
  execute format('alter table %I enable row level security',tab);
  execute format('create policy public_catalog_read on %I for select using (true)',tab);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('grant select on %I to anon',tab); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('grant select on %I to authenticated',tab); end if;
 end loop;
end $$;
commit;
