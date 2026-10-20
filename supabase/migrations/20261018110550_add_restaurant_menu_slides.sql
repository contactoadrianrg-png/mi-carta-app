-- Editable promotional images; existing restaurant ownership RLS remains in force.
alter table public.restaurants
  add column menu_slides jsonb not null default '[]'::jsonb
  constraint restaurants_menu_slides_array check (
    jsonb_typeof(menu_slides) = 'array' and jsonb_array_length(menu_slides) <= 6
  );
grant update (menu_slides) on public.restaurants to authenticated;
