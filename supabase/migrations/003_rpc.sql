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
