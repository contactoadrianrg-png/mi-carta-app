-- Workspace privado para que el administrador pueda seguir cada cuenta.
-- Las notas no se exponen en la carta pública ni pueden ser editadas por el propietario.
alter table public.restaurants
  add column if not exists admin_notes text not null default ''
    check (char_length(admin_notes) <= 2000);

-- El retorno de una función no se puede alterar con CREATE OR REPLACE.
drop function if exists public.admin_get_all_restaurants();

create function public.admin_get_all_restaurants()
returns table(
  id uuid,
  name text,
  slug text,
  description text,
  active boolean,
  plan text,
  theme text,
  created_at timestamptz,
  owner_id uuid,
  owner_email text,
  dish_count bigint,
  category_count bigint,
  has_logo boolean,
  has_highlight boolean,
  has_reservations boolean,
  has_daily_menu boolean,
  admin_notes text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select lower(u.email) from auth.users u where u.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    r.id, r.name, r.slug, r.description, r.active, r.plan, r.theme, r.created_at,
    r.owner_id, u.email::text,
    (select count(*) from public.dishes d where d.restaurant_id = r.id),
    (select count(*) from public.categories c where c.restaurant_id = r.id),
    coalesce(nullif(btrim(r.logo_url), ''), '') <> '',
    coalesce(nullif(btrim(r.banner_url), ''), '') <> '' or jsonb_array_length(r.menu_slides) > 0,
    coalesce(nullif(btrim(r.reservation_url), ''), '') <> '' or coalesce(nullif(btrim(r.social_whatsapp), ''), '') <> '',
    coalesce((r.daily_menu ->> 'enabled')::boolean, false),
    r.admin_notes
  from public.restaurants r
  join auth.users u on u.id = r.owner_id
  order by r.created_at desc;
end;
$$;

create or replace function public.admin_set_restaurant_notes(p_restaurant_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select lower(u.email) from auth.users u where u.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;
  if p_notes is null or char_length(p_notes) > 2000 then
    raise exception 'Las notas no pueden superar 2.000 caracteres';
  end if;
  update public.restaurants set admin_notes = btrim(p_notes) where id = p_restaurant_id;
end;
$$;

revoke all on function public.admin_get_all_restaurants() from public, anon;
revoke all on function public.admin_set_restaurant_notes(uuid, text) from public, anon;
grant execute on function public.admin_get_all_restaurants() to authenticated;
grant execute on function public.admin_set_restaurant_notes(uuid, text) to authenticated;
