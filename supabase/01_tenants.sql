-- =====================================================
-- ZUQUIX MULTI-TENANT — Tabla de Hosteles (Tenants)
-- Ejecutar PRIMERO en el SQL Editor de Supabase
-- =====================================================

-- Tabla principal de hosteles
CREATE TABLE IF NOT EXISTS hostels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,           -- ej: "hostel-sol-panama"
  email       TEXT        NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  country     TEXT        DEFAULT 'PA',
  timezone    TEXT        DEFAULT 'America/Panama',
  currency    TEXT        DEFAULT 'USD',
  logo_url    TEXT,
  plan        TEXT        DEFAULT 'free'
                          CHECK (plan IN ('free', 'starter', 'pro')),
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hostels_updated_at
  BEFORE UPDATE ON hostels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- Agregar hostel_id a todas las tablas existentes
-- (ALTER TABLE es seguro: IF NOT EXISTS evita errores)
-- ─────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE beds
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE cash_register
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS hostel_id UUID REFERENCES hostels(id);

-- ─────────────────────────────────────────────────────
-- Índices para performance en queries multi-tenant
-- ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_hostel      ON profiles(hostel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hostel          ON rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_beds_hostel           ON beds(hostel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hostel   ON reservations(hostel_id);
CREATE INDEX IF NOT EXISTS idx_guests_hostel         ON guests(hostel_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hostel   ON transactions(hostel_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_hostel  ON cash_register(hostel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hostel          ON tasks(hostel_id);

-- ─────────────────────────────────────────────────────
-- MIGRACIÓN: Asignar hostel_id a datos existentes
-- (Solo si ya tienes datos; crea un hostel inicial)
-- ─────────────────────────────────────────────────────

-- Paso 1: Insertar hostel inicial para datos legacy
INSERT INTO hostels (id, name, slug, email, city, country)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Hostel Bocas del Toro',
  'hostel-bocas-del-toro',
  'admin@hostelbocas.com',
  'Bocas del Toro',
  'PA'
) ON CONFLICT (id) DO NOTHING;

-- Paso 2: Asignar ese hostel a todos los datos existentes
UPDATE profiles      SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE rooms         SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE beds          SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE reservations  SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE guests        SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE transactions  SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE cash_register SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
UPDATE tasks         SET hostel_id = '00000000-0000-0000-0000-000000000001' WHERE hostel_id IS NULL;
