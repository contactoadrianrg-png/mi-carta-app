-- Añadir columna color_theme a la tabla restaurants
-- Ejecutar en: Supabase Dashboard > SQL Editor
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS color_theme text NOT NULL DEFAULT 'orange';
