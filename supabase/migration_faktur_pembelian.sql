-- ============================================================
-- MIGRATION: Tambah kolom informasi faktur ke purchase_transactions
-- Jalankan di Supabase SQL Editor
-- ============================================================

ALTER TABLE purchase_transactions
  ADD COLUMN IF NOT EXISTS nama_sales           TEXT,
  ADD COLUMN IF NOT EXISTS nomor_faktur         TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_faktur       DATE,
  ADD COLUMN IF NOT EXISTS tanggal_jatuh_tempo  DATE,
  ADD COLUMN IF NOT EXISTS tanggal_sampai       DATE,
  ADD COLUMN IF NOT EXISTS foto_faktur_url      TEXT;

-- ============================================================
-- Storage bucket untuk foto faktur
-- Buat bucket "faktur-pembelian" di Supabase dashboard:
--   Storage > New Bucket > name: faktur-pembelian > Public: OFF
-- Lalu jalankan policy berikut:
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('faktur-pembelian', 'faktur-pembelian', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload faktur"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'faktur-pembelian');

CREATE POLICY "Auth users can view faktur"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'faktur-pembelian');
