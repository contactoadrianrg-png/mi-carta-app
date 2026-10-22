-- Optional external delivery links, edited under the existing owner RLS policy.
alter table public.restaurants
  add column if not exists delivery_glovo_url text,
  add column if not exists delivery_uber_eats_url text,
  add column if not exists delivery_just_eat_url text;

grant update (delivery_glovo_url, delivery_uber_eats_url, delivery_just_eat_url)
  on public.restaurants to authenticated;
