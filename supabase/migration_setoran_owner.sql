-- ============================================================
-- MIGRASI: Tambah akun OWNER dan support tipe OWNER
-- ============================================================

-- 1. Ubah constraint type di tabel accounts
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check 
  CHECK (type IN ('KAS', 'BRANKAS', 'BANK', 'OWNER'));

-- 2. Ubah constraint account_type di tabel cash_transactions
ALTER TABLE public.cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_account_type_check;
ALTER TABLE public.cash_transactions ADD CONSTRAINT cash_transactions_account_type_check 
  CHECK (account_type IN ('KAS', 'BRANKAS', 'BANK', 'OWNER'));

-- 3. Tambah reference_type baru untuk mutasi pindah saldo
ALTER TABLE public.cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_reference_type_check;
ALTER TABLE public.cash_transactions ADD CONSTRAINT cash_transactions_reference_type_check
  CHECK (reference_type IN (
    'SALE', 'PURCHASE', 'EXPENSE', 'CASH_DROP', 'BANK_DEPOSIT',
    'SALE_REVERSAL', 'PURCHASE_REVERSAL', 'DEBT_PAYMENT',
    'MANUAL', 'OPENING_BALANCE', 'PINDAH_SALDO', 'EXPENSE_REVERSAL'
  ));

-- 4. Insert akun Setoran Owner (jika belum ada)
INSERT INTO public.accounts (name, type, is_active, sort_order)
SELECT 'Setoran Owner', 'OWNER', true, 6
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounts WHERE type = 'OWNER'
);
