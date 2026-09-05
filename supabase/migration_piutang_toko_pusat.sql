-- ============================================================
-- MIGRATION: Fitur Piutang Toko Pusat
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom ke tabel sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS is_toko_pusat BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status_pembayaran TEXT NOT NULL DEFAULT 'PAID'
    CHECK (status_pembayaran IN ('PAID','PIUTANG','LUNAS'));

-- 2. Tabel customer_receivables (piutang ke toko pusat)
CREATE TABLE IF NOT EXISTS customer_receivables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_piutang      TEXT NOT NULL UNIQUE,
  sale_id           UUID NOT NULL REFERENCES sales(id),
  tanggal           DATE NOT NULL,
  customer_name     TEXT NOT NULL DEFAULT 'Toko Pusat',
  total             NUMERIC(15,2) NOT NULL,
  total_dibayar     NUMERIC(15,2) NOT NULL DEFAULT 0,
  sisa_piutang      NUMERIC(15,2) GENERATED ALWAYS AS (total - total_dibayar) STORED,
  status_pembayaran TEXT NOT NULL DEFAULT 'BELUM_LUNAS'
    CHECK (status_pembayaran IN ('BELUM_LUNAS','LUNAS','PARSIAL')),
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receivables_sale ON customer_receivables(sale_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON customer_receivables(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_receivables_tanggal ON customer_receivables(tanggal);

-- 3. Tabel customer_payments (pembayaran piutang)
CREATE TABLE IF NOT EXISTS customer_payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_pembayaran  TEXT NOT NULL UNIQUE,
  receivable_id    UUID NOT NULL REFERENCES customer_receivables(id),
  tanggal          DATE NOT NULL,
  nominal          NUMERIC(15,2) NOT NULL,
  payment_method   TEXT NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','TRANSFER','QRIS')),
  account_id       UUID REFERENCES accounts(id),
  keterangan       TEXT,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_receivable ON customer_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_tanggal ON customer_payments(tanggal);

-- 4. RLS
ALTER TABLE customer_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all" ON customer_receivables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON customer_receivables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON customer_receivables FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read all" ON customer_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON customer_payments FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Functions generate kode
CREATE OR REPLACE FUNCTION generate_kode_piutang()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq INT;
  kode TEXT;
BEGIN
  prefix := 'PT-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COUNT(*) + 1 INTO seq
  FROM customer_receivables
  WHERE kode_piutang LIKE prefix || '%';
  kode := prefix || LPAD(seq::TEXT, 4, '0');
  RETURN kode;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_kode_pembayaran_piutang()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq INT;
  kode TEXT;
BEGIN
  prefix := 'PP-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
  SELECT COUNT(*) + 1 INTO seq
  FROM customer_payments
  WHERE kode_pembayaran LIKE prefix || '%';
  kode := prefix || LPAD(seq::TEXT, 4, '0');
  RETURN kode;
END;
$$ LANGUAGE plpgsql;
