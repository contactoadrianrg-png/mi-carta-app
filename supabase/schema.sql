-- =====================================================
-- MenuApp — Schema para Supabase
-- Ejecuta este SQL en: Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabla: restaurantes
create table if not exists public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tabla: categorías
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Tabla: platos
create table if not exists public.dishes (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10, 2) not null,
  image_url     text,
  available     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Índices para performance
create index if not exists idx_restaurants_owner  on public.restaurants(owner_id);
create index if not exists idx_restaurants_slug   on public.restaurants(slug);
create index if not exists idx_categories_rest    on public.categories(restaurant_id);
create index if not exists idx_dishes_rest        on public.dishes(restaurant_id);
create index if not exists idx_dishes_category    on public.dishes(category_id);

-- Trigger: updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger restaurants_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create or replace trigger dishes_updated_at
  before update on public.dishes
  for each row execute function public.set_updated_at();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

alter table public.restaurants enable row level security;
alter table public.categories  enable row level security;
alter table public.dishes      enable row level security;

-- RESTAURANTS
create policy "restaurants_public_read"
  on public.restaurants for select
  using (true);

create policy "restaurants_owner_insert"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

create policy "restaurants_owner_update"
  on public.restaurants for update
  using (auth.uid() = owner_id);

create policy "restaurants_owner_delete"
  on public.restaurants for delete
  using (auth.uid() = owner_id);

-- CATEGORIES
create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "categories_owner_write"
  on public.categories for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

-- DISHES
create policy "dishes_public_read"
  on public.dishes for select
  using (true);

create policy "dishes_owner_write"
  on public.dishes for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

-- =====================================================
-- Storage: bucket para fotos de platos
-- =====================================================

insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

-- Políticas de storage
create policy "dish_images_public_read"
  on storage.objects for select
  using (bucket_id = 'dish-images');

create policy "dish_images_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'dish-images'
    and auth.role() = 'authenticated'
  );

create policy "dish_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'dish-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "dish_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'dish-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- =====================================================
-- Migración: subcategorías en categories
-- =====================================================

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;

create index if not exists idx_categories_parent on public.categories(parent_id);

-- =====================================================
-- Migración: redes sociales en restaurants
-- Ejecuta este bloque si la tabla ya existe
-- =====================================================

alter table public.restaurants
  add column if not exists social_whatsapp  text,
  add column if not exists social_instagram text,
  add column if not exists social_facebook  text,
  add column if not exists social_tiktok    text,
  add column if not exists social_phone     text,
  add column if not exists social_web       text;

-- =====================================================
-- Habilitar Realtime en las tablas
-- =====================================================

alter publication supabase_realtime add table public.restaurants;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.dishes;

-- =====================================================
-- Migración: destacados, más vendidos y ofertas en dishes
-- =====================================================

alter table public.dishes
  add column if not exists featured      boolean not null default false,
  add column if not exists best_seller   boolean not null default false,
  add column if not exists original_price numeric(10, 2);

-- =====================================================
-- Migración: banner y estado activo en restaurants
-- =====================================================

alter table public.restaurants
  add column if not exists banner_url text,
  add column if not exists active     boolean not null default true;

-- =====================================================
-- Migración: enlace de reservas e imagen de bienvenida en restaurants
-- =====================================================

alter table public.restaurants
  add column if not exists reservation_url text,
  add column if not exists welcome_image_url text;

-- =====================================================
-- Funciones de Super Admin (SECURITY DEFINER)
-- Permiten al admin leer auth.users y actualizar
-- cualquier restaurante sin restricciones de RLS.
-- =====================================================

create or replace function admin_get_all_restaurants()
returns table(
  id          uuid,
  name        text,
  slug        text,
  description text,
  active      boolean,
  created_at  timestamptz,
  owner_id    uuid,
  owner_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select email from auth.users where id = auth.uid()) != 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    r.id,
    r.name,
    r.slug,
    r.description,
    r.active,
    r.created_at,
    r.owner_id,
    u.email::text as owner_email
  from public.restaurants r
  join auth.users u on u.id = r.owner_id
  order by r.created_at desc;
end;
$$;

create or replace function admin_set_restaurant_active(p_restaurant_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select email from auth.users where id = auth.uid()) != 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  update public.restaurants set active = p_active where id = p_restaurant_id;
end;
$$;

-- =====================================================
-- Migración: sistema de planes (Free / Pro / Premium)
-- =====================================================

alter table public.restaurants
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'premium'));

-- Actualizar admin_get_all_restaurants para devolver plan
create or replace function admin_get_all_restaurants()
returns table(
  id          uuid,
  name        text,
  slug        text,
  description text,
  active      boolean,
  plan        text,
  created_at  timestamptz,
  owner_id    uuid,
  owner_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select email from auth.users where id = auth.uid()) != 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    r.id,
    r.name,
    r.slug,
    r.description,
    r.active,
    r.plan,
    r.created_at,
    r.owner_id,
    u.email::text as owner_email
  from public.restaurants r
  join auth.users u on u.id = r.owner_id
  order by r.created_at desc;
end;
$$;

-- Función para cambiar el plan desde el super admin
create or replace function admin_set_restaurant_plan(p_restaurant_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select email from auth.users where id = auth.uid()) != 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  if p_plan not in ('free', 'pro', 'premium') then
    raise exception 'Plan inválido';
  end if;

  update public.restaurants set plan = p_plan where id = p_restaurant_id;
end;
$$;
