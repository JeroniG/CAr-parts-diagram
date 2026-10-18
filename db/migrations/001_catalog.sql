begin;
create type geometry_accuracy as enum ('A','B','C','D');
create type fitment_status as enum ('vin-confirmed','catalog-confirmed','cross-checked','tentative','unknown');
create table source_record (
 id text primary key, source_url text not null, publisher text not null, document_title text not null,
 publication_date date, retrieved_at date not null, rights text not null, notes text not null default ''
);
create table vehicle_configuration (
 id text primary key, manufacturer text not null, model text not null, year integer not null check(year between 1886 and 2200),
 generation text not null, chassis_code text not null, market text not null, trim text not null, body_style text not null,
 engine_code text, transmission_code text, engine text not null, transmission text not null, drivetrain text not null,
 production_start date, production_end date, dimensions jsonb not null default '{}',
 check(production_end is null or production_start is null or production_end>=production_start),
 unique(manufacturer,model,year,chassis_code,market,trim,body_style,engine,transmission,production_start,production_end)
);
create table vehicle_source (vehicle_config_id text references vehicle_configuration(id), source_id text references source_record(id), primary key(vehicle_config_id,source_id));
create table vehicle_system (id text primary key, name text not null,description text not null,color text not null,parent_system_id text references vehicle_system(id),check(id<>parent_system_id));
create table component (
 id text primary key, vehicle_config_id text not null references vehicle_configuration(id), system_id text not null references vehicle_system(id),
 parent_component_id text, name text not null,description text not null,function text not null,location text not null,
 side text not null check(side in ('left','right','center')),component_type text not null check(component_type in ('assembly','part')),
 safety_critical boolean not null default false, serviceable boolean, accuracy geometry_accuracy not null default 'D',
 aliases text[] not null default '{}',geometry_notes text not null,unique(id,vehicle_config_id),
 foreign key(parent_component_id,vehicle_config_id) references component(id,vehicle_config_id) deferrable initially deferred,
 check(id<>parent_component_id)
);
create index component_parent_idx on component(parent_component_id);
create index component_system_config_idx on component(vehicle_config_id,system_id);
create index component_search_idx on component using gin(to_tsvector('english',name||' '||description));
create table component_source(component_id text references component(id),source_id text references source_record(id),primary key(component_id,source_id));
create table component_relationship (
 component_id text not null, related_component_id text not null, vehicle_config_id text not null references vehicle_configuration(id),
 relationship_type text not null check(relationship_type in ('actuates','mates-with','mounted-to','drives')),
 source_id text not null references source_record(id),primary key(component_id,related_component_id,relationship_type),
 foreign key(component_id,vehicle_config_id) references component(id,vehicle_config_id),
 foreign key(related_component_id,vehicle_config_id) references component(id,vehicle_config_id),check(component_id<>related_component_id)
);
create table model_asset (
 id text primary key, vehicle_config_id text not null references vehicle_configuration(id), file_url text not null, source_url text not null,
 author text not null, license text not null, license_evidence text not null, redistribution_allowed boolean not null default false,
 geometry_accuracy geometry_accuracy not null, dimensional_verification text not null,
 asset_version text not null,content_hash text not null check(content_hash ~ '^[0-9a-f]{64}$'),
 unique(id,vehicle_config_id), unique(vehicle_config_id,asset_version),check(geometry_accuracy<>'D')
);
create table mesh_binding (
 id text primary key,model_asset_id text not null,component_id text not null,vehicle_config_id text not null,
 mesh_node_path text not null,transform_data jsonb not null,bounding_box jsonb not null,accuracy_status geometry_accuracy not null,
 foreign key(model_asset_id,vehicle_config_id) references model_asset(id,vehicle_config_id),
 foreign key(component_id,vehicle_config_id) references component(id,vehicle_config_id),
 unique(model_asset_id,mesh_node_path),check(accuracy_status<>'D')
);
create index mesh_binding_component_idx on mesh_binding(component_id);
create table oem_part (
 id text primary key,manufacturer text not null,part_number text not null check(length(trim(part_number))>0),description text not null,
 superseded_by text references oem_part(id),source_id text not null references source_record(id),unique(manufacturer,part_number),check(id<>superseded_by)
);
create table part_fitment (
 id text primary key,oem_part_id text not null references oem_part(id),vehicle_config_id text not null references vehicle_configuration(id),component_id text not null,
 production_range daterange,trim_restrictions text[] not null default '{}',option_restrictions text[] not null default '{}',
 verification_status fitment_status not null default 'unknown',verified_at date,source_id text not null references source_record(id),notes text not null,
 vin_evidence_reference text, -- access-controlled evidence identifier; never store VIN in public tables
 foreign key(component_id,vehicle_config_id) references component(id,vehicle_config_id),
 unique(oem_part_id,vehicle_config_id,component_id),
 check(verification_status not in ('vin-confirmed','catalog-confirmed','cross-checked') or verified_at is not null),
 check(verification_status<>'vin-confirmed' or vin_evidence_reference is not null)
);
create index fitment_vehicle_component_idx on part_fitment(vehicle_config_id,component_id);
create table mechanism_animation (
 id text primary key,component_id text not null references component(id),asset_url text,clip_name text,description text not null,
 accuracy_status geometry_accuracy not null,reference_source_id text not null references source_record(id),check(accuracy_status<>'D')
);
-- Protect arbitrary-depth hierarchy from cycles at commit, including bulk imports.
create function reject_component_cycle() returns trigger language plpgsql as $$
begin
 if exists (
  with recursive lineage as (
   select id,parent_component_id,array[id] as visited,false as cycle from component where id=new.id
   union all
   select c.id,c.parent_component_id,l.visited||c.id,c.id=any(l.visited)
   from component c join lineage l on c.id=l.parent_component_id where not l.cycle
  ) select 1 from lineage where cycle
 ) then raise exception 'Component hierarchy contains a cycle'; end if;
 return new;
end $$;
create constraint trigger component_no_cycles after insert or update on component deferrable initially deferred for each row execute function reject_component_cycle();
-- Public reads; no client write policies. Import only reviewed, publishable data using a server role.
do $$ declare tab text; begin
 foreach tab in array array['source_record','vehicle_configuration','vehicle_source','vehicle_system','component','component_source','component_relationship','model_asset','mesh_binding','oem_part','part_fitment','mechanism_animation'] loop
  execute format('alter table %I enable row level security',tab);
  execute format('create policy public_catalog_read on %I for select using (true)',tab);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('grant select on %I to anon',tab); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('grant select on %I to authenticated',tab); end if;
 end loop;
end $$;
commit;
