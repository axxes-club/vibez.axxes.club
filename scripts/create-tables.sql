-- Vibez tables. Additive only: creates vibez_* tables, never alters shared ones.
create table if not exists vibez_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  slug text not null unique,
  name text not null,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  access_mode text not null default 'scan',
  geo_lat double precision,
  geo_lng double precision,
  geo_radius_m integer not null default 300,
  moderation text not null default 'auto',
  flash_default boolean not null default true,
  max_photos integer not null default 500,
  per_guest_per_hour integer not null default 20,
  status text not null default 'live',
  external_ref text,
  created_by_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vibez_events_tenant_idx on vibez_events (tenant_id);

create table if not exists vibez_spots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  label text not null,
  token text not null unique,
  scans integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists vibez_spots_event_idx on vibez_spots (event_id);

create table if not exists vibez_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  spot_id uuid,
  guest_id text not null,
  author_name text,
  caption text,
  url text not null,
  asset_id uuid,
  status text not null default 'live',
  reactions integer not null default 0,
  report_count integer not null default 0,
  removed_by_id text,
  created_at timestamptz not null default now()
);
create index if not exists vibez_photos_event_idx on vibez_photos (event_id, created_at);
create index if not exists vibez_photos_guest_idx on vibez_photos (event_id, guest_id);

create table if not exists vibez_reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null,
  guest_id text not null,
  reason text not null default 'other',
  created_at timestamptz not null default now()
);
create unique index if not exists vibez_reports_once_idx on vibez_reports (photo_id, guest_id);

create table if not exists vibez_bans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  guest_id text not null,
  banned_by_id text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists vibez_bans_once_idx on vibez_bans (event_id, guest_id);
