-- Menambahkan kolom transfer_details untuk menyimpan rincian nominal per bank/qris
ALTER TABLE public.daily_closings
ADD COLUMN IF NOT EXISTS transfer_details JSONB DEFAULT '{}'::jsonb;
