-- Daily-menu choices are stored separately from public.dishes.
-- No existing restaurant or dish content is changed.
create function public.is_valid_daily_menu(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare
  field text;
  item jsonb;
  limit_length integer;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) <> 'object' or octet_length(value::text) > 20000
    or jsonb_typeof(value->'enabled') is distinct from 'boolean' then return false; end if;
  foreach field in array array['title','description','image_url','includes','availability'] loop
    limit_length := case field when 'title' then 80 when 'description' then 400 when 'image_url' then 2048 when 'includes' then 200 else 160 end;
    if jsonb_typeof(value->field) is distinct from 'string' or length(value->>field) > limit_length then return false; end if;
  end loop;
  if length(btrim(value->>'title')) = 0 then return false; end if;
  if value->>'image_url' <> '' and value->>'image_url' !~ '^https?://' then return false; end if;
  if jsonb_typeof(value->'price') is distinct from 'null' then
    if jsonb_typeof(value->'price') is distinct from 'number' then return false; end if;
    if (value->>'price')::numeric < 0 or (value->>'price')::numeric > 99999.99
      or round((value->>'price')::numeric,2) <> (value->>'price')::numeric then return false; end if;
  end if;
  foreach field in array array['firsts','seconds','desserts'] loop
    if jsonb_typeof(value->field) is distinct from 'array' then return false; end if;
    if jsonb_array_length(value->field) > 10 then return false; end if;
    for item in select jsonb_array_elements(value->field) loop
      if jsonb_typeof(item) <> 'string' or length(btrim(item #>> '{}')) = 0 or length(item #>> '{}') > 160 then return false; end if;
    end loop;
  end loop;
  if (value->>'enabled')::boolean and (jsonb_typeof(value->'price') = 'null'
    or jsonb_array_length(value->'firsts') + jsonb_array_length(value->'seconds') = 0) then return false; end if;
  return true;
end;
$$;
revoke all on function public.is_valid_daily_menu(jsonb) from public, anon;
grant execute on function public.is_valid_daily_menu(jsonb) to authenticated;
alter table public.restaurants add column daily_menu jsonb
  constraint restaurants_daily_menu_valid check (public.is_valid_daily_menu(daily_menu));
grant update (daily_menu) on public.restaurants to authenticated;
