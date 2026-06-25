-- =============================================
-- Tracking tables para estadísticas de Messa
-- Ejecutar en: Supabase → SQL Editor
-- =============================================

-- 1. Visitas a la carta pública
CREATE TABLE IF NOT EXISTS carta_views (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  viewed_at     timestamp with time zone DEFAULT now()
);

-- 2. Clics en platos
CREATE TABLE IF NOT EXISTS plate_views (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  plate_id      uuid,
  plate_name    text,
  viewed_at     timestamp with time zone DEFAULT now()
);

-- Row Level Security
ALTER TABLE carta_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_views ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante puede insertar (tracking anónimo)
CREATE POLICY "public_insert_carta_views"
  ON carta_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_insert_plate_views"
  ON plate_views FOR INSERT
  WITH CHECK (true);

-- Solo el dueño del restaurante puede leer sus datos
CREATE POLICY "owner_select_carta_views"
  ON carta_views FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_select_plate_views"
  ON plate_views FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS carta_views_restaurant_idx ON carta_views (restaurant_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS plate_views_restaurant_idx ON plate_views (restaurant_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS plate_views_name_idx       ON plate_views (restaurant_id, plate_name);
