-- El editor usa social_phone como teléfono único y permite guardar la dirección.
alter table public.restaurants add column if not exists address text;
grant update (address) on public.restaurants to authenticated;
