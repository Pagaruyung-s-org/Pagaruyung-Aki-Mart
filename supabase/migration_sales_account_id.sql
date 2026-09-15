-- Migration: tambah account_id ke tabel sales
-- Jalankan sekali di Supabase SQL Editor

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_account ON sales(account_id);
