ALTER TABLE public.supplier_payments
ADD COLUMN status_transaksi text DEFAULT 'PAID' NOT NULL CHECK (status_transaksi IN ('PAID', 'VOID', 'REVERSAL'));

ALTER TABLE public.supplier_payments
ADD COLUMN void_reason text,
ADD COLUMN void_by uuid REFERENCES auth.users(id),
ADD COLUMN void_at timestamp with time zone;

-- Optional: reload postgrest schema
NOTIFY pgrst, 'reload schema';
