-- Migración compatible con el esquema real inspeccionado el 18-10-2026.
-- Conserva las filas y firmas existentes. Añade subcategorías/estadísticas y
-- corrige permisos de administrador. Aplicar mediante el registro de migraciones.
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


alter table public.dishes add column if not exists allergens text[] not null default '{}';

create or replace function public.admin_set_restaurant_active(p_restaurant_id uuid, p_active boolean)
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
  add column if not exists logo_url text;

-- Las políticas por fila no restringen las columnas: un propietario no debe
-- poder subir su plan o cambiar campos reservados al administrador por API.
revoke insert, update, truncate, references, trigger on public.restaurants from public, anon, authenticated;
grant insert (owner_id, name, slug, description)
  on public.restaurants to authenticated;
grant update (
  name, slug, description, banner_url, welcome_image_url, logo_url,
  reservation_url, color_theme, social_whatsapp, social_instagram,
  social_facebook, social_tiktok, social_phone, social_web
) on public.restaurants to authenticated;

-- Una sola definición: CREATE OR REPLACE no permite cambiar el tipo de retorno.
create or replace function public.admin_get_all_restaurants()
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
create or replace function public.admin_set_restaurant_plan(p_restaurant_id uuid, p_plan text)
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
create or replace function public.admin_set_restaurant_theme(p_restaurant_id uuid, p_theme text)
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

alter function public.set_updated_at() set search_path = public;

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
