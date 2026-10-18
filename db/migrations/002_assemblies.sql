begin;
-- Separate asset versions/LODs and visual presentation from repair evidence.
create table assembly_asset (
 assembly_id text not null,
 model_asset_id text not null,
 vehicle_config_id text not null references vehicle_configuration(id),
 lod text not null check(lod in ('low','high')),
 motion_rig text,
 primary key(assembly_id,lod),
 foreign key(assembly_id,vehicle_config_id) references component(id,vehicle_config_id),
 foreign key(model_asset_id,vehicle_config_id) references model_asset(id,vehicle_config_id)
);
create table assembly_part_profile (
 component_id text primary key,
 assembly_id text not null,
 vehicle_config_id text not null references vehicle_configuration(id),
 material_description text not null,
 material_verification text not null default 'not-yet-verified' check(material_verification in ('not-yet-verified','verified')),
 material_source_id text references source_record(id),
 material_verified_at date,
 diagram_callout text not null,
 motion_group text not null check(motion_group in ('upper','lower','fixed','strut')),
 exploded_transform jsonb not null,
 foreign key(component_id,vehicle_config_id) references component(id,vehicle_config_id),
 foreign key(assembly_id,vehicle_config_id) references component(id,vehicle_config_id),
 check(material_verification<>'verified' or (material_source_id is not null and material_verified_at is not null))
);
create table repair_procedure (
 id text primary key,
 component_id text not null,
 vehicle_config_id text not null references vehicle_configuration(id),
 title text not null,
 source_id text not null references source_record(id),
 license_evidence text not null,
 redistribution_allowed boolean not null default false,
 reviewed_at date not null,
 reviewed_by text not null,
 equipment_restrictions text[] not null default '{}',
 production_range daterange,
 instructions jsonb not null,
 foreign key(component_id,vehicle_config_id) references component(id,vehicle_config_id),
 check(redistribution_allowed and length(trim(license_evidence))>0 and length(trim(reviewed_by))>0)
);
-- No repair rows are seeded: available references do not establish a licensed removal procedure.
do $$ declare tab text; begin
 foreach tab in array array['assembly_asset','assembly_part_profile','repair_procedure'] loop
  execute format('alter table %I enable row level security',tab);
  execute format('create policy public_catalog_read on %I for select using (true)',tab);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('grant select on %I to anon',tab); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('grant select on %I to authenticated',tab); end if;
 end loop;
end $$;
commit;
