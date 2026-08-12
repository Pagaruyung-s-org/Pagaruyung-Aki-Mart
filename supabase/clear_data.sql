-- Script untuk menghapus Data Produk dan Data Transaksi
-- Berguna untuk reset sistem ke keadaan awal.
-- Data Master lainnya (Karyawan, Supplier, Kategori Biaya) TIDAK dihapus.

TRUNCATE TABLE 
  sale_batch_allocations, 
  sale_items, 
  sales,
  supplier_payments,
  inventory_movements,
  inventory_batches,
  purchase_items,
  purchase_transactions,
  expenses,
  cash_transactions,
  products
CASCADE;
