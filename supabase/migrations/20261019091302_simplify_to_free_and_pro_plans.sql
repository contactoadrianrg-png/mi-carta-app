-- MESSA arranca con una oferta simple: Free y Pro.
-- Las cuentas Premium existentes conservan sus prestaciones al pasar a Pro.
update public.restaurants
set plan = 'pro'
where plan = 'premium';

alter table public.restaurants
  drop constraint if exists restaurants_plan_check;

alter table public.restaurants
  add constraint restaurants_plan_check
  check (plan in ('free', 'pro'));

create or replace function public.admin_set_restaurant_plan(p_restaurant_id uuid, p_plan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select lower(u.email) from auth.users u where u.id = auth.uid()) is distinct from 'infocreativeadrian@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  if p_plan is null or p_plan not in ('free', 'pro') then
    raise exception 'Plan inválido';
  end if;

  update public.restaurants set plan = p_plan where id = p_restaurant_id;
end;
$$;

revoke all on function public.admin_set_restaurant_plan(uuid, text) from public, anon;
grant execute on function public.admin_set_restaurant_plan(uuid, text) to authenticated;
