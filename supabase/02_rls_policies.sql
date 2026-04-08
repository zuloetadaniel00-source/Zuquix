-- =====================================================
-- ZUQUIX MULTI-TENANT — Row Level Security
-- Ejecutar DESPUÉS de 01_tenants.sql
-- =====================================================

-- ─────────────────────────────────────────────────────
-- Función helper: obtiene el hostel_id del usuario actual
-- SECURITY DEFINER: corre con privilegios del owner,
-- evitando recursión en políticas de profiles
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_hostel_id()
RETURNS UUID AS $$
  SELECT hostel_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────
-- Habilitar RLS en todas las tablas
-- ─────────────────────────────────────────────────────

ALTER TABLE hostels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — hostels
-- Los admins ven y editan solo su hostel
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_select_own" ON hostels;
CREATE POLICY "hostel_select_own" ON hostels
  FOR SELECT USING (id = get_user_hostel_id());

DROP POLICY IF EXISTS "hostel_update_own" ON hostels;
CREATE POLICY "hostel_update_own" ON hostels
  FOR UPDATE USING (id = get_user_hostel_id());

-- Insertar hostel solo desde función server-side (register)
DROP POLICY IF EXISTS "hostel_insert_anon" ON hostels;
CREATE POLICY "hostel_insert_anon" ON hostels
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — rooms
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_rooms" ON rooms;
CREATE POLICY "hostel_isolation_rooms" ON rooms
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — beds
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_beds" ON beds;
CREATE POLICY "hostel_isolation_beds" ON beds
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — reservations
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_reservations" ON reservations;
CREATE POLICY "hostel_isolation_reservations" ON reservations
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — guests
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_guests" ON guests;
CREATE POLICY "hostel_isolation_guests" ON guests
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — transactions
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_transactions" ON transactions;
CREATE POLICY "hostel_isolation_transactions" ON transactions
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — cash_register
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_cash" ON cash_register;
CREATE POLICY "hostel_isolation_cash" ON cash_register
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — tasks
-- ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hostel_isolation_tasks" ON tasks;
CREATE POLICY "hostel_isolation_tasks" ON tasks
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- POLÍTICAS — profiles
-- Cada usuario solo ve su propio perfil
-- ─────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin puede ver perfiles de su mismo hostel
DROP POLICY IF EXISTS "profiles_select_same_hostel" ON profiles;
CREATE POLICY "profiles_select_same_hostel" ON profiles
  FOR SELECT USING (hostel_id = get_user_hostel_id());
