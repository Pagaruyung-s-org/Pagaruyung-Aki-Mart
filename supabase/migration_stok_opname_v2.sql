-- ============================================================
-- MIGRATION: Stok Opname v2 (Session-based) + Opening Balance
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. APP_SETTINGS — Pengaturan aplikasi (toggle fitur)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_by      UUID REFERENCES auth.users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default: Opening Balance feature aktif
INSERT INTO app_settings (key, value) VALUES ('feature_opening_balance', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings" ON app_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON app_settings FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 2. OPNAME_SESSIONS — Header sesi opname
-- ============================================================
CREATE TABLE IF NOT EXISTS opname_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_opname     TEXT NOT NULL UNIQUE,
    tanggal         DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'IN_PROGRESS'
                    CHECK (status IN ('IN_PROGRESS','COMPLETED','EXPIRED')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    started_by      UUID NOT NULL REFERENCES auth.users(id),
    completed_by    UUID REFERENCES auth.users(id),
    keterangan      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opname_sessions_status ON opname_sessions(status);
CREATE INDEX IF NOT EXISTS idx_opname_sessions_tanggal ON opname_sessions(tanggal);

ALTER TABLE opname_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read opname_sessions" ON opname_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert opname_sessions" ON opname_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update opname_sessions" ON opname_sessions FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- 3. OPNAME_ITEMS — Detail per SKU dalam sesi
-- ============================================================
CREATE TABLE IF NOT EXISTS opname_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID NOT NULL REFERENCES opname_sessions(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id),
    system_qty_snapshot NUMERIC(10,2) NOT NULL,
    physical_qty        NUMERIC(10,2),
    expected_qty        NUMERIC(10,2),
    selisih             NUMERIC(10,2),
    harga_modal_aktual  NUMERIC(15,2),
    keterangan          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_opname_items_session ON opname_items(session_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_product ON opname_items(product_id);

ALTER TABLE opname_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read opname_items" ON opname_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert opname_items" ON opname_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update opname_items" ON opname_items FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- 4. OPENING_BALANCES — Saldo awal per SKU
-- ============================================================
CREATE TABLE IF NOT EXISTS opening_balances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id),
    qty             NUMERIC(10,2) NOT NULL,
    harga_modal     NUMERIC(15,2) NOT NULL,
    keterangan      TEXT,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_product ON opening_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_locked ON opening_balances(is_locked);

ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read opening_balances" ON opening_balances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert opening_balances" ON opening_balances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update opening_balances" ON opening_balances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete opening_balances" ON opening_balances FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 5. Update inventory_movements movement_type CHECK
-- ============================================================
-- Drop existing constraint and recreate with OPENING_BALANCE
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_movement_type_check
    CHECK (movement_type IN ('PURCHASE','SALE','PURCHASE_RETURN','SALE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','OPENING_BALANCE'));

-- ============================================================
-- 6. Function: Generate kode opname (SO-YYYYMMDD-XXXX)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_kode_opname()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INT;
    kode TEXT;
BEGIN
    prefix := 'SO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    SELECT COUNT(*) + 1 INTO seq
    FROM opname_sessions
    WHERE kode_opname LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Function: Auto-expire sesi opname yang sudah lewat hari
-- ============================================================
CREATE OR REPLACE FUNCTION expire_old_opname_sessions()
RETURNS void AS $$
BEGIN
    UPDATE opname_sessions
    SET status = 'EXPIRED'
    WHERE status = 'IN_PROGRESS'
      AND tanggal < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Ensure inventory_batches.purchase_item_id is nullable
--    (from previous migration, safe to repeat)
-- ============================================================
ALTER TABLE inventory_batches ALTER COLUMN purchase_item_id DROP NOT NULL;
