-- The restaurant may link its own ordering website alongside delivery platforms.
alter table public.restaurants add column if not exists delivery_custom_url text;
grant update (delivery_custom_url) on public.restaurants to authenticated;
