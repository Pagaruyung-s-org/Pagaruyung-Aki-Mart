-- ============================================================
-- MIGRATION: Split Payment untuk Penjualan
-- ============================================================

-- 1. Ubah constraint payment_method di tabel sales agar menerima 'SPLIT'
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IN ('CASH', 'TRANSFER', 'QRIS', 'SPLIT'));

-- 2. Tambah kolom split_payments (JSONB) untuk menyimpan rincian pembayaran
-- Format: [{"method": "CASH", "account_id": "uuid", "amount": 50000}, {"method": "TRANSFER", "account_id": "uuid", "amount": 100000}]
ALTER TABLE sales ADD COLUMN IF NOT EXISTS split_payments JSONB;
