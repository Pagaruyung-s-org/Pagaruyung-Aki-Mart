export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// MASTER DATA TYPES
// ============================================================

export interface Product {
  id: string
  kode_produk: string
  merk: string
  kategori: string
  type: string | null
  kode_baterai: string | null
  kapasitas_ah: number
  harga_jual: number
  qty_stok: number
  status: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  kode_supplier: string
  nama_supplier: string
  alamat: string | null
  telepon: string | null
  email: string | null
  status: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  kode_karyawan: string
  nama_karyawan: string
  jabatan: string | null
  gaji: number
  status: boolean
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  kode_kategori: string
  nama_kategori: string
  status: boolean
  created_at: string
}

// ============================================================
// PEMBELIAN TYPES
// ============================================================

export type StatusPembayaran = 'LUNAS' | 'HUTANG' | 'PARSIAL'
export type StatusTransaksi = 'DRAFT' | 'POSTED' | 'CANCELLED'
export type StatusPenjualan = 'DRAFT' | 'PAID' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'BRANKAS'

export interface PurchaseTransaction {
  id: string
  kode_pembelian: string
  tanggal: string
  supplier_id: string
  nominal: number
  pajak: number
  total: number
  status_pembayaran: StatusPembayaran
  status_transaksi: StatusTransaksi
  keterangan: string | null
  created_by: string | null
  created_at: string
  // Joined
  suppliers?: Supplier
  purchase_items?: PurchaseItem[]
}

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string
  qty: number
  nominal: number
  harga_modal_unit: number
  created_at: string
  // Joined
  products?: Product
}

// ============================================================
// INVENTORY TYPES
// ============================================================

export type MovementType = 'PURCHASE' | 'SALE' | 'PURCHASE_RETURN' | 'SALE_RETURN' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'OPENING_BALANCE'

export interface InventoryBatch {
  id: string
  product_id: string
  purchase_item_id: string | null
  tanggal_masuk: string
  qty_awal: number
  qty_tersedia: number
  harga_modal_unit: number
  created_at: string
  // Joined
  products?: Product
}

export interface InventoryMovement {
  id: string
  product_id: string
  batch_id: string | null
  movement_type: MovementType
  reference_id: string | null
  reference_type: string | null
  qty_in: number
  qty_out: number
  balance: number | null
  transaction_date: string
  keterangan: string | null
  created_at: string
  // Joined
  products?: Product
}

// ============================================================
// PENJUALAN TYPES
// ============================================================

export interface Sale {
  id: string
  kode_penjualan: string
  tanggal: string
  customer_name: string | null
  subtotal: number
  discount: number
  total: number
  payment_method: PaymentMethod
  status_transaksi: StatusPenjualan
  keterangan: string | null
  created_by: string | null
  created_at: string
  // Joined
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  qty: number
  harga_jual: number
  subtotal: number
  hpp_fifo: number
  laba_kotor: number
  created_at: string
  // Joined
  products?: Product
  sale_batch_allocations?: SaleBatchAllocation[]
}

export interface SaleBatchAllocation {
  id: string
  sale_item_id: string
  batch_id: string
  qty_used: number
  harga_modal_unit: number
  subtotal_hpp: number
  created_at: string
  // Joined
  inventory_batches?: InventoryBatch
}

// ============================================================
// OPERASIONAL & KEUANGAN TYPES
// ============================================================

export interface Expense {
  id: string
  kode_pengeluaran: string
  tanggal: string
  category_id: string
  employee_id: string | null
  keterangan: string | null
  nominal: number
  payment_method: PaymentMethod
  status_transaksi: 'DRAFT' | 'POSTED' | 'CANCELLED'
  created_by: string | null
  created_at: string
  // Joined
  expense_categories?: ExpenseCategory
  employees?: Employee
}

export interface SupplierPayment {
  id: string
  kode_pembayaran: string
  supplier_id: string
  purchase_id: string | null
  tanggal: string
  nominal: number
  payment_method: PaymentMethod
  keterangan: string | null
  status_transaksi: 'PAID' | 'VOID' | 'REVERSAL'
  void_reason?: string | null
  void_by?: string | null
  void_at?: string | null
  created_by: string | null
  created_at: string
  // Joined
  suppliers?: Supplier
  purchase_transactions?: PurchaseTransaction
}

export type AccountType = 'KAS' | 'BANK' | 'BRANKAS'
export type TransactionType = 'DEBIT' | 'CREDIT'

export interface CashTransaction {
  id: string
  tanggal: string
  account_type: AccountType
  transaction_type: TransactionType
  reference_type: string | null
  reference_id: string | null
  debit: number
  credit: number
  description: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Json | null
  new_data: Json | null
  created_at: string
}

// ============================================================
// FORM INPUT TYPES (untuk Server Actions)
// ============================================================

export interface PurchaseItemInput {
  product_id: string
  qty: number
  nominal: number
}

export interface CreatePurchaseInput {
  tanggal: string
  supplier_id: string
  status_pembayaran: StatusPembayaran
  keterangan?: string
  items: PurchaseItemInput[]
}

export interface SaleItemInput {
  product_id: string
  qty: number
  harga_jual: number
  discount?: number
}

export interface CreateSaleInput {
  customer_name?: string
  payment_method: PaymentMethod
  discount?: number
  keterangan?: string
  items: SaleItemInput[]
}

export interface CreateExpenseInput {
  tanggal: string
  category_id: string
  employee_id?: string
  keterangan?: string
  nominal: number
  payment_method: PaymentMethod
}

export interface CreateSupplierPaymentInput {
  supplier_id: string
  purchase_id?: string
  tanggal: string
  nominal: number
  payment_method: PaymentMethod
  keterangan?: string
}

export type ClosingStatus = 'DRAFT' | 'SUBMITTED'

export interface DailyClosing {
  id: string
  tanggal: string
  total_penjualan_tunai: number
  total_penjualan_transfer: number
  total_pengeluaran_tunai: number
  total_bayar_hutang: number
  total_cash_drop: number
  estimasi_sisa_laci: number
  catatan: string | null
  status: ClosingStatus
  is_late: boolean
  created_by: string | null
  submitted_by: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateClosingInput {
  tanggal: string
  total_cash_drop: number
  catatan?: string
}

export interface CreateSetorInput {
  tanggal: string
  nominal: number
  keterangan?: string
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  penjualan_hari_ini: number
  penjualan_bulan_ini: number
  laba_kotor_bulan_ini: number
  total_hutang_supplier: number
  saldo_kas: number
  stok_produk_aktif: number
  produk_stok_rendah: Product[]
}

export interface SalesChartData {
  bulan: string
  penjualan: number
  laba: number
  pembelian: number
}

export interface TopProduct {
  product_id: string
  merk: string
  kategori: string
  total_qty: number
  total_omzet: number
}

// ============================================================
// STOK OPNAME TYPES
// ============================================================

export type OpnameStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED'

export interface OpnameSession {
  id: string
  kode_opname: string
  tanggal: string
  status: OpnameStatus
  started_at: string
  completed_at: string | null
  started_by: string
  completed_by: string | null
  keterangan: string | null
  created_at: string
  // Joined
  opname_items?: OpnameItem[]
}

export interface OpnameItem {
  id: string
  session_id: string
  product_id: string
  system_qty_snapshot: number
  physical_qty: number | null
  expected_qty: number | null
  selisih: number | null
  harga_modal_aktual: number | null
  keterangan: string | null
  created_at: string
  // Joined
  products?: Product
}

export interface OpeningBalance {
  id: string
  product_id: string
  qty: number
  harga_modal: number
  keterangan: string | null
  is_locked: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  products?: Product
}

export interface AppSetting {
  key: string
  value: any
  updated_by: string | null
  updated_at: string
}
