-- ============================================================
-- SISTEM MANAJEMEN PENJUALAN & KEUANGAN USAHA AKI
-- Schema Database PostgreSQL (Supabase)
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PRODUCTS — Master Produk
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_produk      TEXT NOT NULL UNIQUE,
    merk             TEXT NOT NULL,
    kategori         TEXT NOT NULL,
    type             TEXT,
    kode_baterai     TEXT,
    kapasitas_ah     NUMERIC(10,2) NOT NULL,
    harga_jual       NUMERIC(15,2) NOT NULL DEFAULT 0,
    qty_stok         NUMERIC(10,2) NOT NULL DEFAULT 0,
    status           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_merk ON products(merk);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_kode ON products(kode_produk);

-- ============================================================
-- 2. SUPPLIERS — Master Supplier/Distributor
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_supplier    TEXT NOT NULL UNIQUE,
    nama_supplier    TEXT NOT NULL,
    alamat           TEXT,
    telepon          TEXT,
    email            TEXT,
    status           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_status ON suppliers(status);

-- ============================================================
-- 3. EMPLOYEES — Master Karyawan
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_karyawan    TEXT NOT NULL UNIQUE,
    nama_karyawan    TEXT NOT NULL,
    jabatan          TEXT,
    gaji             NUMERIC(15,2) NOT NULL DEFAULT 0,
    status           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. EXPENSE_CATEGORIES — Master Kategori Biaya
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_kategori    TEXT NOT NULL UNIQUE,
    nama_kategori    TEXT NOT NULL,
    status           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. PURCHASE_TRANSACTIONS — Header Pembelian
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_pembelian      TEXT NOT NULL UNIQUE,
    tanggal             DATE NOT NULL,
    supplier_id         UUID NOT NULL REFERENCES suppliers(id),
    nominal             NUMERIC(15,2) NOT NULL DEFAULT 0,
    pajak               NUMERIC(15,2) NOT NULL DEFAULT 0,  -- 11% dari nominal
    total               NUMERIC(15,2) NOT NULL DEFAULT 0,  -- nominal + pajak
    status_pembayaran   TEXT NOT NULL DEFAULT 'HUTANG' CHECK (status_pembayaran IN ('LUNAS','HUTANG','PARSIAL')),
    status_transaksi    TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status_transaksi IN ('DRAFT','POSTED','CANCELLED')),
    keterangan          TEXT,
    created_by          UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    void_reason         TEXT,
    void_by             UUID REFERENCES auth.users(id),
    void_at             TIMESTAMPTZ
);

CREATE INDEX idx_purchase_tanggal ON purchase_transactions(tanggal);
CREATE INDEX idx_purchase_supplier ON purchase_transactions(supplier_id);
CREATE INDEX idx_purchase_status ON purchase_transactions(status_transaksi);

-- ============================================================
-- 6. PURCHASE_ITEMS — Detail Item Pembelian
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id      UUID NOT NULL REFERENCES purchase_transactions(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products(id),
    qty              NUMERIC(10,2) NOT NULL,
    nominal          NUMERIC(15,2) NOT NULL,  -- total harga sebelum pajak untuk item ini
    harga_modal_unit NUMERIC(15,2) NOT NULL,                       -- nominal / qty
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product ON purchase_items(product_id);

-- ============================================================
-- 7. INVENTORY_BATCHES — Batch FIFO
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_batches (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id       UUID NOT NULL REFERENCES products(id),
    purchase_item_id UUID NOT NULL REFERENCES purchase_items(id),
    tanggal_masuk    DATE NOT NULL,
    qty_awal         NUMERIC(10,2) NOT NULL,
    qty_tersedia     NUMERIC(10,2) NOT NULL CHECK (qty_tersedia >= 0),
    harga_modal_unit NUMERIC(15,2) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_qty_tersedia CHECK (qty_tersedia <= qty_awal)
);

CREATE INDEX idx_batches_product ON inventory_batches(product_id);
CREATE INDEX idx_batches_product_date ON inventory_batches(product_id, tanggal_masuk ASC);  -- untuk FIFO
CREATE INDEX idx_batches_available ON inventory_batches(product_id, qty_tersedia) WHERE qty_tersedia > 0;

-- ============================================================
-- 8. INVENTORY_MOVEMENTS — Mutasi Stok
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id       UUID NOT NULL REFERENCES products(id),
    batch_id         UUID REFERENCES inventory_batches(id),
    movement_type    TEXT NOT NULL CHECK (movement_type IN ('PURCHASE','SALE','PURCHASE_RETURN','SALE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT')),
    reference_id     UUID,
    reference_type   TEXT,
    qty_in           NUMERIC(10,2) NOT NULL DEFAULT 0,
    qty_out          NUMERIC(10,2) NOT NULL DEFAULT 0,
    balance          NUMERIC(10,2),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keterangan       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_date ON inventory_movements(transaction_date);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);

-- ============================================================
-- 9. SALES — Header Penjualan
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_penjualan   TEXT NOT NULL UNIQUE,
    tanggal          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_name    TEXT,
    subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount         NUMERIC(15,2) NOT NULL DEFAULT 0,
    total            NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method   TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH','TRANSFER','QRIS')),
    status_transaksi TEXT NOT NULL DEFAULT 'PAID' CHECK (status_transaksi IN ('DRAFT','PAID','CANCELLED')),
    keterangan       TEXT,
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    include_air_aki     BOOLEAN DEFAULT FALSE,
    jumlah_air_aki      INTEGER DEFAULT 0,
    harga_jual_air_aki  NUMERIC(15,2) DEFAULT 0,
    hpp_air_aki         NUMERIC(15,2) DEFAULT 0,
    laba_air_aki        NUMERIC(15,2) DEFAULT 0,
    void_reason         TEXT,
    void_by             UUID REFERENCES auth.users(id),
    void_at             TIMESTAMPTZ
);

CREATE INDEX idx_sales_tanggal ON sales(tanggal);
CREATE INDEX idx_sales_status ON sales(status_transaksi);

-- ============================================================
-- 10. SALE_ITEMS — Detail Item Penjualan
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id          UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products(id),
    qty              NUMERIC(10,2) NOT NULL,
    harga_jual       NUMERIC(15,2) NOT NULL,    -- harga saat transaksi (snapshot)
    subtotal         NUMERIC(15,2) NOT NULL,    -- qty × harga_jual
    hpp_fifo         NUMERIC(15,2) NOT NULL DEFAULT 0,  -- HPP dari alokasi FIFO
    laba_kotor       NUMERIC(15,2) NOT NULL DEFAULT 0,  -- subtotal - hpp_fifo
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ============================================================
-- 11. SALE_BATCH_ALLOCATIONS — Detail Alokasi FIFO per Penjualan
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_batch_allocations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_item_id     UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    batch_id         UUID NOT NULL REFERENCES inventory_batches(id),
    qty_used         NUMERIC(10,2) NOT NULL,
    harga_modal_unit NUMERIC(15,2) NOT NULL,
    subtotal_hpp     NUMERIC(15,2) NOT NULL,  -- qty_used × harga_modal_unit
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allocations_sale_item ON sale_batch_allocations(sale_item_id);
CREATE INDEX idx_allocations_batch ON sale_batch_allocations(batch_id);

-- ============================================================
-- 12. EXPENSES — Biaya Operasional
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_pengeluaran TEXT NOT NULL UNIQUE,
    tanggal          DATE NOT NULL,
    category_id      UUID NOT NULL REFERENCES expense_categories(id),
    employee_id      UUID REFERENCES employees(id),
    keterangan       TEXT,
    nominal          NUMERIC(15,2) NOT NULL,
    payment_method   TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH','TRANSFER','QRIS')),
    status_transaksi TEXT NOT NULL DEFAULT 'POSTED' CHECK (status_transaksi IN ('DRAFT','POSTED','CANCELLED')),
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    void_reason         TEXT,
    void_by             UUID REFERENCES auth.users(id),
    void_at             TIMESTAMPTZ
);

CREATE INDEX idx_expenses_tanggal ON expenses(tanggal);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- ============================================================
-- 13. SUPPLIER_PAYMENTS — Pembayaran Hutang Supplier
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_pembayaran  TEXT NOT NULL UNIQUE,
    supplier_id      UUID NOT NULL REFERENCES suppliers(id),
    purchase_id      UUID REFERENCES purchase_transactions(id),
    tanggal          DATE NOT NULL,
    nominal          NUMERIC(15,2) NOT NULL,
    payment_method   TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH','TRANSFER','QRIS')),
    keterangan       TEXT,
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_transaksi TEXT NOT NULL DEFAULT 'PAID' CHECK (status_transaksi IN ('PAID', 'VOID', 'REVERSAL')),
    void_reason      TEXT,
    void_by          UUID REFERENCES auth.users(id),
    void_at          TIMESTAMPTZ
);

CREATE INDEX idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_tanggal ON supplier_payments(tanggal);


-- ============================================================
-- AIR AKI TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS air_aki_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kode_pembelian text NOT NULL UNIQUE,
  tanggal date NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  jumlah_botol integer NOT NULL,
  harga_per_botol numeric NOT NULL,
  total numeric DEFAULT 0,
  keterangan text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS air_aki_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES air_aki_purchases(id),
  tanggal_masuk date NOT NULL,
  jumlah_awal integer NOT NULL,
  jumlah_sisa integer NOT NULL,
  harga_per_botol numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS air_aki_sale_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  batch_id uuid REFERENCES air_aki_batches(id),
  jumlah_dipakai integer NOT NULL,
  harga_per_botol numeric NOT NULL,
  subtotal_hpp numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================
-- 14. CASH_TRANSACTIONS — Kas/Bank
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_type     TEXT NOT NULL DEFAULT 'KAS' CHECK (account_type IN ('KAS','BANK')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEBIT','CREDIT')),
    reference_type   TEXT,     -- 'SALE','PURCHASE','EXPENSE','PAYMENT'
    reference_id     UUID,
    debit            NUMERIC(15,2) NOT NULL DEFAULT 0,   -- kas masuk
    credit           NUMERIC(15,2) NOT NULL DEFAULT 0,   -- kas keluar
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_tanggal ON cash_transactions(tanggal);
CREATE INDEX idx_cash_type ON cash_transactions(transaction_type);
CREATE INDEX idx_cash_reference ON cash_transactions(reference_type, reference_id);

-- ============================================================
-- 15. AUDIT_LOGS — Log Audit
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES auth.users(id),
    action           TEXT NOT NULL,           -- INSERT, UPDATE, DELETE
    table_name       TEXT NOT NULL,
    record_id        UUID,
    old_data         JSONB,
    new_data         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on semua tabel
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_batch_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: user yang sudah login bisa membaca semua data
CREATE POLICY "Authenticated users can read all" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON purchase_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON sale_batch_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON supplier_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON cash_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read all" ON audit_logs FOR SELECT TO authenticated USING (true);

-- Policy: INSERT untuk authenticated
CREATE POLICY "Authenticated users can insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON expense_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON purchase_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON purchase_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON inventory_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON sale_batch_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON cash_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: UPDATE untuk authenticated
CREATE POLICY "Authenticated users can update" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON expense_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON purchase_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON inventory_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can update" ON expenses FOR UPDATE TO authenticated USING (true);

-- Policy: DELETE untuk authenticated (master data saja)
CREATE POLICY "Authenticated users can delete" ON suppliers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON employees FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON expense_categories FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SEED DATA — Kategori Biaya Default
-- ============================================================
INSERT INTO expense_categories (kode_kategori, nama_kategori) VALUES
('KAT-001', 'Gaji'),
('KAT-002', 'Listrik'),
('KAT-003', 'Air'),
('KAT-004', 'Internet'),
('KAT-005', 'BBM'),
('KAT-006', 'Sewa'),
('KAT-007', 'Servis Kendaraan'),
('KAT-008', 'ATK'),
('KAT-009', 'Marketing'),
('KAT-010', 'Konsultan'),
('KAT-011', 'Pajak Operasional'),
('KAT-012', 'Lainnya')
ON CONFLICT (kode_kategori) DO NOTHING;

-- ============================================================
-- FUNCTIONS — Helper untuk Generate Kode Dokumen
-- ============================================================

-- Function: Generate kode pembelian (PB-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION generate_kode_pembelian()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INT;
    kode TEXT;
BEGIN
    prefix := 'PB-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq
    FROM purchase_transactions
    WHERE kode_pembelian LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate kode penjualan (PJ-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION generate_kode_penjualan()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INT;
    kode TEXT;
BEGIN
    prefix := 'PJ-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq
    FROM sales
    WHERE kode_penjualan LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate kode pengeluaran (OP-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION generate_kode_pengeluaran()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INT;
    kode TEXT;
BEGIN
    prefix := 'OP-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq
    FROM expenses
    WHERE kode_pengeluaran LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate kode pembayaran hutang (PH-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION generate_kode_pembayaran()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INT;
    kode TEXT;
BEGIN
    prefix := 'PH-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    SELECT COUNT(*) + 1 INTO seq
    FROM supplier_payments
    WHERE kode_pembayaran LIKE prefix || '%';
    kode := prefix || LPAD(seq::TEXT, 4, '0');
    RETURN kode;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS — Auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TABLE public.activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_value JSONB NULL,
    new_value JSONB NULL,
    reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- Mengaktifkan RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select for owner and super admin" ON activity_log FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
