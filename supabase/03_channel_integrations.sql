-- =====================================================
-- ZUQUIX MULTI-TENANT — Channel Integrations
-- Ejecutar DESPUÉS de 02_rls_policies.sql
-- =====================================================

-- ─────────────────────────────────────────────────────
-- Credenciales de canales de reserva (Booking, Expedia…)
-- Las API keys se almacenan como texto; en producción
-- usar Supabase Vault para cifrado adicional.
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channel_integrations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id            UUID        NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  channel              TEXT        NOT NULL
                                   CHECK (channel IN ('booking', 'expedia', 'hostelworld', 'airbnb', 'manual')),
  is_active            BOOLEAN     DEFAULT false,
  api_key              TEXT,
  api_secret           TEXT,
  hotel_id_external    TEXT,       -- ID del hostel en el canal externo
  last_sync_at         TIMESTAMPTZ,
  sync_status          TEXT        DEFAULT 'pending'
                                   CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error           TEXT,
  reservations_this_month INT      DEFAULT 0,
  settings             JSONB       DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hostel_id, channel)
);

CREATE TRIGGER channel_integrations_updated_at
  BEFORE UPDATE ON channel_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- Reservas importadas desde canales externos
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channel_reservations (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id                UUID        NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  reservation_id           UUID        REFERENCES reservations(id),  -- vinculada si ya se importó
  channel                  TEXT        NOT NULL,
  external_reservation_id  TEXT        NOT NULL,
  external_guest_name      TEXT,
  external_guest_email     TEXT,
  check_in_date            DATE        NOT NULL,
  check_out_date           DATE        NOT NULL,
  room_type                TEXT,
  total_amount             DECIMAL(10,2),
  commission               DECIMAL(10,2),
  net_amount               DECIMAL(10,2),
  status                   TEXT        DEFAULT 'pending'
                                       CHECK (status IN ('pending', 'imported', 'cancelled', 'error')),
  raw_data                 JSONB,
  imported_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel, external_reservation_id)
);

-- ─────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_channel_integrations_hostel
  ON channel_integrations(hostel_id);

CREATE INDEX IF NOT EXISTS idx_channel_reservations_hostel
  ON channel_reservations(hostel_id);

CREATE INDEX IF NOT EXISTS idx_channel_reservations_status
  ON channel_reservations(hostel_id, status);

-- ─────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────

ALTER TABLE channel_integrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_reservations  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hostel_isolation_channels" ON channel_integrations;
CREATE POLICY "hostel_isolation_channels" ON channel_integrations
  FOR ALL USING (hostel_id = get_user_hostel_id());

DROP POLICY IF EXISTS "hostel_isolation_channel_res" ON channel_reservations;
CREATE POLICY "hostel_isolation_channel_res" ON channel_reservations
  FOR ALL USING (hostel_id = get_user_hostel_id());

-- ─────────────────────────────────────────────────────
-- Función: actualizar contador de reservas del mes
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_channel_monthly_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'imported' AND (OLD.status IS NULL OR OLD.status <> 'imported') THEN
    UPDATE channel_integrations
    SET reservations_this_month = reservations_this_month + 1
    WHERE hostel_id = NEW.hostel_id AND channel = NEW.channel;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER channel_reservations_count
  AFTER INSERT OR UPDATE ON channel_reservations
  FOR EACH ROW EXECUTE FUNCTION update_channel_monthly_count();
