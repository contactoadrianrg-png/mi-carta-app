-- Esquema y funciones leídos de Supabase el 18-10-2026. Sin datos personales ni claves.
create table public.restaurants (id uuid not null default gen_random_uuid(), owner_id uuid not null, name text not null, slug text not null, description text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), social_whatsapp text, social_instagram text, social_facebook text, social_tiktok text, social_phone text, social_web text, banner_url text, active boolean default true, reservation_url text, welcome_image_url text, plan text default 'free'::text, visit_count integer default 0, color_theme text default 'orange'::text, theme text default 'default'::text);
create table public.categories (id uuid not null default gen_random_uuid(), restaurant_id uuid not null, name text not null, sort_order integer not null default 0, created_at timestamp with time zone not null default now());
create table public.dishes (id uuid not null default gen_random_uuid(), restaurant_id uuid not null, category_id uuid, name text not null, description text, price numeric(10,2) not null, image_url text, available boolean not null default true, sort_order integer not null default 0, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), featured boolean default false, best_seller boolean default false, original_price numeric, is_special boolean default false);
alter table restaurants add constraint restaurants_pkey PRIMARY KEY (id);
alter table dishes add constraint dishes_pkey PRIMARY KEY (id);
alter table categories add constraint categories_pkey PRIMARY KEY (id);
alter table restaurants add constraint restaurants_slug_key UNIQUE (slug);
alter table dishes add constraint dishes_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table categories add constraint categories_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
alter table dishes add constraint dishes_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table restaurants add constraint restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.restaurants enable row level security;
grant all on public.restaurants to anon, authenticated;
alter table public.categories enable row level security;
grant all on public.categories to anon, authenticated;
alter table public.dishes enable row level security;
grant all on public.dishes to anon, authenticated;
create policy "categories_owner_write" on public.categories for ALL to public using ((EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = categories.restaurant_id) AND (r.owner_id = auth.uid())))));
create policy "categories_public_read" on public.categories for SELECT to public using (true);
create policy "dishes_owner_write" on public.dishes for ALL to public using ((EXISTS ( SELECT 1
   FROM restaurants r
  WHERE ((r.id = dishes.restaurant_id) AND (r.owner_id = auth.uid())))));
create policy "dishes_public_read" on public.dishes for SELECT to public using (true);
create policy "restaurants_owner_delete" on public.restaurants for DELETE to public using ((auth.uid() = owner_id));
create policy "restaurants_owner_update" on public.restaurants for UPDATE to public using ((auth.uid() = owner_id));
create policy "restaurants_owner_insert" on public.restaurants for INSERT to public with check ((auth.uid() = owner_id));
create policy "restaurants_public_read" on public.restaurants for SELECT to public using (true);
CREATE OR REPLACE FUNCTION public.admin_set_restaurant_active(p_restaurant_id uuid, p_active boolean)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  update public.restaurants
  set active = p_active
  where id = p_restaurant_id;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_restaurant_plan(p_restaurant_id uuid, p_plan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (select email from auth.users where id = auth.uid()) != 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;
  if p_plan not in ('free', 'pro', 'premium') then
    raise exception 'Plan invalido';
  end if;
  update public.restaurants set plan = p_plan where id = p_restaurant_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_restaurant_theme(p_restaurant_id uuid, p_theme text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'infocreativeadrian@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_theme NOT IN ('default', 'jungle', 'maibacht') THEN
    RAISE EXCEPTION 'Tema inválido';
  END IF;
  UPDATE public.restaurants SET theme = p_theme WHERE id = p_restaurant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_all_restaurants()
 RETURNS TABLE(id uuid, name text, slug text, description text, active boolean, plan text, theme text, created_at timestamp with time zone, owner_id uuid, owner_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()) != 'infocreativeadrian@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT
      r.id,
      r.name,
      r.slug,
      r.description,
      r.active,
      r.plan,
      r.theme,
      r.created_at,
      r.owner_id,
      u.email::text AS owner_email
    FROM public.restaurants r
    JOIN auth.users u ON u.id = r.owner_id
    ORDER BY r.created_at DESC
  ) AS q;
END;
$function$;
