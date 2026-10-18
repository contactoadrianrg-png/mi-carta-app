-- =====================================================
-- Messa — esquema de referencia para una instalación NUEVA de Supabase.
-- No ejecutar completo sobre producción: primero comparar el esquema real
-- y preparar una migración que preserve sus funciones, políticas y datos.
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
returns trigger language plpgsql set search_path = public as $$
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
  add column if not exists parent_id uuid;

create unique index if not exists categories_restaurant_id_id_key
  on public.categories(restaurant_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.categories'::regclass and conname = 'categories_parent_same_restaurant') then
    alter table public.categories add constraint categories_parent_same_restaurant
      foreign key (restaurant_id, parent_id) references public.categories(restaurant_id, id) on delete cascade;
  end if;
end;
$$;

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
  add column if not exists is_special    boolean not null default false,
  add column if not exists allergens     text[] not null default '{}',
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

create or replace function admin_set_restaurant_active(p_restaurant_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select lower(admin_user.email) from auth.users admin_user where admin_user.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
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

-- Campos visuales utilizados por la carta y el panel de administración.
alter table public.restaurants
  add column if not exists color_theme text not null default 'orange',
  add column if not exists theme text not null default 'default',
  add column if not exists logo_url text,
  add column if not exists address text;

-- Las políticas por fila no restringen las columnas: un propietario no debe
-- poder subir su plan o cambiar campos reservados al administrador por API.
revoke insert, update, truncate, references, trigger on public.restaurants from public, anon, authenticated;
grant insert (owner_id, name, slug, description)
  on public.restaurants to authenticated;
grant update (
  name, slug, description, banner_url, welcome_image_url, logo_url,
  reservation_url, color_theme, address, social_whatsapp, social_instagram,
  social_facebook, social_tiktok, social_phone, social_web
) on public.restaurants to authenticated;

-- Una sola definición: CREATE OR REPLACE no permite cambiar el tipo de retorno.
create or replace function admin_get_all_restaurants()
returns table(
  id          uuid,
  name        text,
  slug        text,
  description text,
  active      boolean,
  plan        text,
  theme       text,
  created_at  timestamptz,
  owner_id    uuid,
  owner_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select lower(admin_user.email) from auth.users admin_user where admin_user.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
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
    r.theme,
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
  if (select lower(admin_user.email) from auth.users admin_user where admin_user.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  if p_plan is null or p_plan not in ('free', 'pro', 'premium') then
    raise exception 'Plan inválido';
  end if;

  update public.restaurants set plan = p_plan where id = p_restaurant_id;
end;
$$;

-- La interfaz ya llama a esta función; faltaba en el esquema de referencia.
create or replace function admin_set_restaurant_theme(p_restaurant_id uuid, p_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select lower(admin_user.email) from auth.users admin_user where admin_user.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  if p_theme is null or p_theme not in ('default', 'jungle', 'maibacht') then
    raise exception 'Tema inválido';
  end if;

  update public.restaurants set theme = p_theme where id = p_restaurant_id;
end;
$$;

-- Evitar ejecución anónima; cada función comprueba además la identidad admin.
revoke execute on function public.admin_get_all_restaurants() from public, anon;
revoke execute on function public.admin_set_restaurant_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_restaurant_plan(uuid, text) from public, anon;
revoke execute on function public.admin_set_restaurant_theme(uuid, text) from public, anon;
grant execute on function public.admin_get_all_restaurants() to authenticated;
grant execute on function public.admin_set_restaurant_active(uuid, boolean) to authenticated;
grant execute on function public.admin_set_restaurant_plan(uuid, text) to authenticated;
grant execute on function public.admin_set_restaurant_theme(uuid, text) to authenticated;
