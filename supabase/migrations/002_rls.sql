alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.locations enable row level security;
alter table public.photos enable row level security;
alter table public.photo_tags enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "categories_crud_own" on public.categories;
create policy "categories_crud_own"
on public.categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tags_crud_own" on public.tags;
create policy "tags_crud_own"
on public.tags for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "locations_crud_own" on public.locations;
create policy "locations_crud_own"
on public.locations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "photos_select_public_or_own" on public.photos;
create policy "photos_select_public_or_own"
on public.photos for select
using (
  (visibility = 'public' and is_deleted = false)
  or auth.uid() = user_id
);

drop policy if exists "photos_crud_own" on public.photos;
create policy "photos_crud_own"
on public.photos for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "photo_tags_select_public_or_own" on public.photo_tags;
create policy "photo_tags_select_public_or_own"
on public.photo_tags for select
using (
  exists (
    select 1 from public.photos p
    where p.id = photo_id
      and ((p.visibility = 'public' and p.is_deleted = false) or p.user_id = auth.uid())
  )
);

drop policy if exists "photo_tags_crud_own" on public.photo_tags;
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
