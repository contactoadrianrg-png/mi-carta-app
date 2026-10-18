-- One transaction: validate the complete list before changing any positions.
-- SECURITY INVOKER preserves the existing row ownership policies.
create or replace function public.reorder_restaurant_dishes(
  p_restaurant_id uuid,
  p_dish_ids uuid[]
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dish_count integer;
begin
  perform 1 from public.restaurants
    where id = p_restaurant_id and owner_id = (select auth.uid())
    for update;
  if not found then
    raise exception 'No tienes permiso para reorganizar esta carta.' using errcode = '42501';
  end if;

  if p_dish_ids is null or coalesce(array_ndims(p_dish_ids), 1) <> 1
    or array_position(p_dish_ids, null) is not null then
    raise exception 'El orden de los platos no es válido.' using errcode = '22023';
  end if;
  if cardinality(p_dish_ids) <> (select count(distinct id) from unnest(p_dish_ids) as requested(id)) then
    raise exception 'El orden contiene platos repetidos.' using errcode = '22023';
  end if;

  perform 1 from public.dishes where restaurant_id = p_restaurant_id order by id for update;
  select count(*) into dish_count from public.dishes where restaurant_id = p_restaurant_id;
  if dish_count <> cardinality(p_dish_ids) or exists (
    select 1 from unnest(p_dish_ids) as requested(id)
    where not exists (select 1 from public.dishes d where d.id = requested.id and d.restaurant_id = p_restaurant_id)
  ) then
    raise exception 'La carta ha cambiado. Recarga los platos antes de guardar.' using errcode = '40001';
  end if;

  update public.dishes as d
    set sort_order = requested.position::integer - 1
    from unnest(p_dish_ids) with ordinality as requested(id, position)
    where d.restaurant_id = p_restaurant_id and d.id = requested.id
      and d.sort_order is distinct from requested.position::integer - 1;
end;
$$;
revoke all on function public.reorder_restaurant_dishes(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_restaurant_dishes(uuid, uuid[]) to authenticated;
