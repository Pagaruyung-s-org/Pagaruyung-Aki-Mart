-- ============================================================
-- MIGRATION: AKI BEKAS — Bank, Stok, Pembelian, Penjualan
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Master kapasitas aki bekas
CREATE TABLE IF NOT EXISTS public.aki_bekas_categories (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kapasitas_ah  NUMERIC(10,2) NOT NULL UNIQUE,
    harga_beli_default NUMERIC(15,2) NOT NULL DEFAULT 0,
    harga_jual    NUMERIC(15,2) GENERATED ALWAYS AS (kapasitas_ah * 3600) STORED,
    status        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data kapasitas umum
INSERT INTO public.aki_bekas_categories (kapasitas_ah, harga_beli_default) VALUES
  (3.5,  12600), (5, 18000), (7, 25200), (9, 32400),
  (17.5, 63000), (18, 64800), (20, 72000), (24, 86400),
  (32, 115200),  (35, 126000), (38, 136800), (40, 144000),
  (45, 162000),  (55, 198000), (60, 216000), (65, 234000),
  (70, 252000),  (75, 270000), (80, 288000), (100, 360000)
ON CONFLICT (kapasitas_ah) DO NOTHING;

-- 2. Bank Aki Bekas — ledger saldo
CREATE TABLE IF NOT EXISTS public.bank_aki_bekas_transactions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal        DATE NOT NULL DEFAULT CURRENT_DATE,
    jenis          TEXT NOT NULL CHECK (jenis IN ('MASUK','KELUAR')),
    nominal        NUMERIC(15,2) NOT NULL,
    keterangan     TEXT,
    reference_type TEXT CHECK (reference_type IN ('MODAL_AWAL','BELI_BEKAS','JUAL_BEKAS','LAINNYA')),
    reference_id   UUID,
    created_by     UUID REFERENCES auth.users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_aki_bekas_tanggal ON public.bank_aki_bekas_transactions(tanggal);

-- 3. Pembelian Aki Bekas dari pelanggan
CREATE TABLE IF NOT EXISTS public.aki_bekas_purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode            TEXT NOT NULL UNIQUE,
    tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
    kapasitas_ah    NUMERIC(10,2) NOT NULL,
    qty             NUMERIC(10,2) NOT NULL DEFAULT 1,
    harga_beli_unit NUMERIC(15,2) NOT NULL,
    total           NUMERIC(15,2) GENERATED ALWAYS AS (qty * harga_beli_unit) STORED,
    sumber          TEXT NOT NULL DEFAULT 'TUKAR_TAMBAH' CHECK (sumber IN ('TUKAR_TAMBAH','BELI_LANGSUNG')),
    sale_id         UUID REFERENCES public.sales(id),  -- link ke penjualan aki baru jika tukar tambah
    keterangan      TEXT,
    status          TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aki_bekas_purchases_tanggal ON public.aki_bekas_purchases(tanggal);
CREATE INDEX idx_aki_bekas_purchases_kapasitas ON public.aki_bekas_purchases(kapasitas_ah);

-- 4. Batch Stok Aki Bekas (FIFO)
CREATE TABLE IF NOT EXISTS public.aki_bekas_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id     UUID NOT NULL REFERENCES public.aki_bekas_purchases(id),
    kapasitas_ah    NUMERIC(10,2) NOT NULL,
    tanggal_masuk   DATE NOT NULL,
    qty_awal        NUMERIC(10,2) NOT NULL,
    qty_tersedia    NUMERIC(10,2) NOT NULL CHECK (qty_tersedia >= 0),
    harga_beli_unit NUMERIC(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_aki_bekas_qty CHECK (qty_tersedia <= qty_awal)
);

CREATE INDEX idx_aki_bekas_batches_kapasitas ON public.aki_bekas_batches(kapasitas_ah, tanggal_masuk ASC);
CREATE INDEX idx_aki_bekas_batches_available ON public.aki_bekas_batches(kapasitas_ah, qty_tersedia) WHERE qty_tersedia > 0;

-- 5. Penjualan Aki Bekas
CREATE TABLE IF NOT EXISTS public.aki_bekas_sales (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode             TEXT NOT NULL UNIQUE,
    tanggal          DATE NOT NULL DEFAULT CURRENT_DATE,
    kapasitas_ah     NUMERIC(10,2) NOT NULL,
    qty              NUMERIC(10,2) NOT NULL DEFAULT 1,
    harga_jual_unit  NUMERIC(15,2) NOT NULL,
    total            NUMERIC(15,2) GENERATED ALWAYS AS (qty * harga_jual_unit) STORED,
    hpp_total        NUMERIC(15,2) NOT NULL DEFAULT 0,
    laba             NUMERIC(15,2) NOT NULL DEFAULT 0,
    keterangan       TEXT,
    status           TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','VOID')),
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aki_bekas_sales_tanggal ON public.aki_bekas_sales(tanggal);

-- 6. Alokasi FIFO penjualan aki bekas
CREATE TABLE IF NOT EXISTS public.aki_bekas_sale_allocations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id         UUID NOT NULL REFERENCES public.aki_bekas_sales(id) ON DELETE CASCADE,
    batch_id        UUID NOT NULL REFERENCES public.aki_bekas_batches(id),
    qty_used        NUMERIC(10,2) NOT NULL,
    harga_beli_unit NUMERIC(15,2) NOT NULL,
    subtotal_hpp    NUMERIC(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.aki_bekas_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_aki_bekas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aki_bekas_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aki_bekas_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aki_bekas_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aki_bekas_sale_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read aki_bekas_categories" ON public.aki_bekas_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aki_bekas_categories" ON public.aki_bekas_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update aki_bekas_categories" ON public.aki_bekas_categories FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth read bank_aki_bekas" ON public.bank_aki_bekas_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert bank_aki_bekas" ON public.bank_aki_bekas_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth read aki_bekas_purchases" ON public.aki_bekas_purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aki_bekas_purchases" ON public.aki_bekas_purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update aki_bekas_purchases" ON public.aki_bekas_purchases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth read aki_bekas_batches" ON public.aki_bekas_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aki_bekas_batches" ON public.aki_bekas_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update aki_bekas_batches" ON public.aki_bekas_batches FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth read aki_bekas_sales" ON public.aki_bekas_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aki_bekas_sales" ON public.aki_bekas_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update aki_bekas_sales" ON public.aki_bekas_sales FOR UPDATE TO authenticated USING (true);

CREATE POLICY "auth read aki_bekas_allocations" ON public.aki_bekas_sale_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert aki_bekas_allocations" ON public.aki_bekas_sale_allocations FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- Function: Generate kode pembelian aki bekas (AB-YYYYMM-XXXX)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_kode_aki_bekas_purchase()
RETURNS TEXT AS $$
DECLARE prefix TEXT; seq INT; kode TEXT;
BEGIN
    prefix := 'AB-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq FROM public.aki_bekas_purchases WHERE kode LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate kode penjualan aki bekas (SB-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION generate_kode_aki_bekas_sale()
RETURNS TEXT AS $$
DECLARE prefix TEXT; seq INT; kode TEXT;
BEGIN
    prefix := 'SB-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq FROM public.aki_bekas_sales WHERE kode LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;
