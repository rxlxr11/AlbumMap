create extension if not exists pgcrypto;
create extension if not exists postgis;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type public.photo_visibility as enum ('private', 'public', 'friends');
  end if;

  if not exists (select 1 from pg_type where typname = 'coord_system') then
    create type public.coord_system as enum ('wgs84', 'gcj02');
  end if;
end$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  country text,
  province text,
  city text,
  district text,
  address text,
  source text,
  coord_sys public.coord_system not null default 'wgs84',
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  geo_point geography(point, 4326) generated always as
    (st_setsrid(st_makepoint(longitude::double precision, latitude::double precision), 4326)::geography) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (latitude between -90 and 90),
  check (longitude between -180 and 180)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  title text,
  note text,
  visibility public.photo_visibility not null default 'private',
  oss_bucket text not null,
  oss_region text not null,
  oss_object_key text not null,
  oss_url text not null,
  thumbnail_url text,
  width int,
  height int,
  size_bytes bigint,
  mime_type text,
  taken_at timestamptz,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  unique (user_id, oss_object_key)
);

create table if not exists public.photo_tags (
  photo_id uuid not null references public.photos(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, tag_id)
);

create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_tags_user_id on public.tags(user_id);
create index if not exists idx_locations_user_id on public.locations(user_id);
create index if not exists idx_locations_geo on public.locations using gist (geo_point);
create index if not exists idx_photos_user_uploaded on public.photos(user_id, uploaded_at desc);
create index if not exists idx_photos_location_id on public.photos(location_id);
create index if not exists idx_photos_category_id on public.photos(category_id);
create index if not exists idx_photos_visibility on public.photos(visibility);
create index if not exists idx_photos_not_deleted on public.photos(is_deleted);
create index if not exists idx_photo_tags_tag_id on public.photo_tags(tag_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists trg_locations_updated_at on public.locations;
create trigger trg_locations_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

drop trigger if exists trg_photos_updated_at on public.photos;
create trigger trg_photos_updated_at
before update on public.photos
for each row execute function public.set_updated_at();
