# Album Project Deployment and Backend Design

## 1. Scope and Tech Stack

- Frontend: Vue 3 + TypeScript + TailwindCSS + Vite
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- File storage: Aliyun OSS (all original and processed photos)
- Map provider: AMap API or Google Maps API (switchable)

This document focuses on backend operations and database schema.

## 2. Suggested Backend Architecture

1. Client uploads photo to Aliyun OSS (direct upload with temporary credential or signed policy).
2. Client calls Supabase to write metadata (photo URL/object key, location, tags, note, category).
3. Homepage map mode reads map points from Supabase (cluster-friendly query).
4. Waterfall mode reads paginated photo stream from Supabase.
5. Photo detail page reads single photo + tags + category + location + note.

Recommended split:

- OSS handles binary files.
- Supabase stores structured metadata, authorization, filtering, and query APIs.
- Edge Functions handle sensitive logic (temporary credential issuance, callback validation, optional geocoding).

## 3. Supabase Setup Operations

## 3.1 Create Project

- Create a new Supabase project.
- Enable Email Auth (or any login method you need).
- In SQL editor, execute schema and RLS scripts in this document.

## 3.2 Enable Extensions

```sql
create extension if not exists pgcrypto;
create extension if not exists postgis;
```

## 3.3 Environment Variables (Edge Functions)

Set these in Supabase project settings:

- `ALIYUN_OSS_REGION`
- `ALIYUN_OSS_BUCKET`
- `ALIYUN_RAM_ROLE_ARN`
- `ALIYUN_ACCESS_KEY_ID`
- `ALIYUN_ACCESS_KEY_SECRET`
- `AMAP_WEB_API_KEY` (if using AMap reverse geocoding)
- `GOOGLE_MAPS_API_KEY` (if using Google geocoding)

Do not expose Aliyun permanent AccessKey in frontend code.

## 4. Database Schema Design

## 4.1 Enum Types

```sql
do $$
begin
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type public.photo_visibility as enum ('private', 'public', 'friends');
  end if;

  if not exists (select 1 from pg_type where typname = 'coord_system') then
    create type public.coord_system as enum ('wgs84', 'gcj02');
  end if;
end$$;
```

## 4.2 Common Trigger Function

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

## 4.3 Core Tables

```sql
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
```

## 4.4 Indexes

```sql
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
```

## 4.5 Updated At Triggers

```sql
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
```

## 5. Row Level Security (RLS)

Enable RLS:

```sql
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.locations enable row level security;
alter table public.photos enable row level security;
alter table public.photo_tags enable row level security;
```

Policies (private by default, public photos can be viewed by everyone):

```sql
-- profiles
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_upsert_own"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- categories
create policy "categories_crud_own"
on public.categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- tags
create policy "tags_crud_own"
on public.tags for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- locations
create policy "locations_crud_own"
on public.locations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- photos
create policy "photos_select_public_or_own"
on public.photos for select
using (
  (visibility = 'public' and is_deleted = false)
  or auth.uid() = user_id
);

create policy "photos_crud_own"
on public.photos for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- photo_tags: tied to photo ownership
create policy "photo_tags_select_public_or_own"
on public.photo_tags for select
using (
  exists (
    select 1 from public.photos p
    where p.id = photo_id
      and ((p.visibility = 'public' and p.is_deleted = false) or p.user_id = auth.uid())
  )
);

create policy "photo_tags_crud_own"
on public.photo_tags for all
using (
  exists (
    select 1 from public.photos p
    where p.id = photo_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.photos p
    where p.id = photo_id
      and p.user_id = auth.uid()
  )
);
```

If this is a purely personal album with no public browsing, remove public select policies and keep owner-only policies.

## 6. Query Layer (for Map, Waterfall, Detail)

You can query tables directly via Supabase SDK, but creating RPC functions makes frontend cleaner.

## 6.1 Map Markers Query

Use bounds + zoom for scalable loading.

```sql
create or replace function public.get_map_markers(
  in_min_lat numeric,
  in_max_lat numeric,
  in_min_lng numeric,
  in_max_lng numeric,
  in_limit int default 2000
)
returns table (
  photo_id uuid,
  latitude numeric,
  longitude numeric,
  thumbnail_url text,
  taken_at timestamptz,
  note text
)
language sql
stable
as $$
  select
    p.id,
    l.latitude,
    l.longitude,
    coalesce(p.thumbnail_url, p.oss_url) as thumbnail_url,
    p.taken_at,
    p.note
  from public.photos p
  join public.locations l on l.id = p.location_id
  where p.is_deleted = false
    and (p.visibility = 'public' or p.user_id = auth.uid())
    and l.latitude between in_min_lat and in_max_lat
    and l.longitude between in_min_lng and in_max_lng
  order by p.taken_at desc nulls last, p.uploaded_at desc
  limit in_limit;
$$;
```

## 6.2 Waterfall Query

Use cursor pagination (`uploaded_at`, `id`) for stable infinite scroll.

```sql
create or replace function public.get_waterfall_photos(
  in_cursor_uploaded_at timestamptz default null,
  in_cursor_id uuid default null,
  in_limit int default 30
)
returns table (
  photo_id uuid,
  oss_url text,
  thumbnail_url text,
  width int,
  height int,
  note text,
  uploaded_at timestamptz
)
language sql
stable
as $$
  select
    p.id,
    p.oss_url,
    p.thumbnail_url,
    p.width,
    p.height,
    p.note,
    p.uploaded_at
  from public.photos p
  where p.is_deleted = false
    and (p.visibility = 'public' or p.user_id = auth.uid())
    and (
      in_cursor_uploaded_at is null
      or (p.uploaded_at, p.id) < (in_cursor_uploaded_at, in_cursor_id)
    )
  order by p.uploaded_at desc, p.id desc
  limit in_limit;
$$;
```

## 6.3 Photo Detail Query

Get one photo with category/tags/location for detail modal/page.

```sql
create or replace view public.photo_detail_view as
select
  p.id as photo_id,
  p.user_id,
  p.title,
  p.note,
  p.oss_url,
  p.thumbnail_url,
  p.width,
  p.height,
  p.size_bytes,
  p.mime_type,
  p.taken_at,
  p.uploaded_at,
  p.visibility,
  c.id as category_id,
  c.name as category_name,
  l.id as location_id,
  l.name as location_name,
  l.address,
  l.latitude,
  l.longitude
from public.photos p
left join public.categories c on c.id = p.category_id
left join public.locations l on l.id = p.location_id
where p.is_deleted = false;
```

Frontend can separately query tags via `photo_tags -> tags` relation.

## 7. Aliyun OSS Upload Flow

Recommended production flow:

1. Frontend calls Supabase Edge Function `create-upload-session`.
2. Edge Function verifies current user via Supabase JWT.
3. Edge Function requests Aliyun STS temporary credentials (or returns signed policy).
4. Frontend uploads file directly to OSS using temporary credentials.
5. Frontend calls Supabase `insert photos` (or `complete-upload` Edge Function) to save metadata.
6. Optional async image processing generates thumbnails and updates `thumbnail_url`.

Key points:

- Object key convention: `user_id/yyyy/mm/dd/{uuid}-{original_name}`
- Save only `oss_object_key` + public/CDN URL in DB.
- Enforce max file size and mime type in Edge Function.
- Consider anti-duplicate hash (`sha256`) if you need deduplication.

## 8. Map Provider Integration Notes

To support both AMap and Google Maps without changing DB schema:

- Store canonical coordinates in WGS84 in DB.
- If using AMap on frontend, convert WGS84 to GCJ-02 before rendering.
- Keep `coord_sys` field in `locations` for traceability when source is GCJ-02.
- Optional `reverse-geocode` Edge Function can normalize address fields (`country/province/city/district/address`).

## 9. Frontend-Backend Contract Checklist

At upload time, frontend should send:

- `category_id` (nullable)
- `tag_names` or `tag_ids`
- `location` (lat/lng + optional place name/address)
- `note`
- image metadata (`width`, `height`, `size_bytes`, `mime_type`, `taken_at`)

At read time:

- Map mode: call `get_map_markers` by current viewport
- Waterfall mode: call `get_waterfall_photos` with cursor pagination
- Detail mode: query `photo_detail_view` + related tags

## 10. Deployment Order

1. Create Supabase project and enable Auth.
2. Run extension + schema SQL.
3. Enable RLS and create policies.
4. Create RPC/view objects.
5. Deploy Edge Functions for OSS credential issuance and optional reverse geocoding.
6. Configure environment variables.
7. Integrate frontend upload and query flows.
8. Perform end-to-end test: upload -> map point visible -> waterfall visible -> detail visible.

---

If you want, the next step can be a ready-to-run SQL migration split into multiple files (e.g., `001_init.sql`, `002_rls.sql`, `003_rpc.sql`) for direct execution.
