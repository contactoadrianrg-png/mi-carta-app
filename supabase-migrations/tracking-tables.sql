-- Solo para una instalación nueva.
-- Estadísticas: solo eventos válidos de restaurantes activos.
create table if not exists public.carta_views (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create table if not exists public.plate_views (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plate_id uuid not null,
  plate_name text not null,
  viewed_at timestamptz not null default now()
);
alter table public.carta_views enable row level security;
alter table public.plate_views enable row level security;
create policy public_insert_carta_views on public.carta_views for insert to anon, authenticated
  with check (exists (select 1 from public.restaurants r where r.id = carta_views.restaurant_id and r.active is not false));
create policy public_insert_plate_views on public.plate_views for insert to anon, authenticated
  with check (exists (
    select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where d.id = plate_views.plate_id and d.restaurant_id = plate_views.restaurant_id
      and d.name = plate_views.plate_name and d.available and r.active is not false
  ));
create policy owner_select_carta_views on public.carta_views for select to authenticated
  using (exists (select 1 from public.restaurants r where r.id = carta_views.restaurant_id and r.owner_id = (select auth.uid())));
create policy owner_select_plate_views on public.plate_views for select to authenticated
  using (exists (select 1 from public.restaurants r where r.id = plate_views.restaurant_id and r.owner_id = (select auth.uid())));
revoke all on public.carta_views, public.plate_views from public, anon, authenticated;
grant insert (restaurant_id) on public.carta_views to anon, authenticated;
grant insert (restaurant_id, plate_id, plate_name) on public.plate_views to anon, authenticated;
grant select on public.carta_views, public.plate_views to authenticated;
create index if not exists carta_views_restaurant_idx on public.carta_views (restaurant_id, viewed_at desc);
create index if not exists plate_views_restaurant_idx on public.plate_views (restaurant_id, viewed_at desc);
create index if not exists plate_views_name_idx on public.plate_views (restaurant_id, plate_name);
