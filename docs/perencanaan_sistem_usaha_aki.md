# Sistem Manajemen Penjualan & Keuangan Usaha Aki

## 1. Tujuan Sistem

Membangun aplikasi web ringan untuk mengelola operasional usaha aki, mencakup:

- Master produk
- Master supplier/distributor
- Master karyawan
- Master kategori biaya
- Pembelian aki
- Stok
- Batch persediaan
- Perhitungan HPP dengan metode FIFO
- Penjualan dan pembuatan bon
- Hutang kepada supplier
- Pembayaran hutang supplier
- Biaya operasional
- Kas/bank
- Laporan penjualan
- Laporan pembelian
- Laporan stok
- Laporan hutang
- Laporan laba rugi
- Laporan arus kas
- Dashboard usaha

Sistem tidak membutuhkan piutang customer karena seluruh penjualan kepada customer dianggap dibayar saat transaksi.

---

# 2. Keputusan Bisnis

## 2.1 Customer

Tidak dibuat `MASTER_CUSTOMER`.

Customer dicatat langsung pada transaksi/bon jika memang diperlukan.

Tidak ada sistem piutang customer.

## 2.2 Supplier

Usaha dapat memiliki hutang kepada distributor/supplier.

Alurnya:

```text
Pembelian
    ↓
Hutang Supplier
    ↓
Pembayaran Hutang
```

## 2.3 Produk

Satu baris pada master produk mewakili satu kombinasi produk lengkap.

Beberapa atribut produk boleh kosong karena tidak semua merk memiliki struktur atribut yang sama.

Contoh:

```text
Furukawa | Maintenance Free | MF | FB900 | 45 AH
Yuasa    | Maintenance Free |    | YBX5000 | 45 AH
```

`TYPE` tidak wajib tersedia untuk semua produk.

`KODE_BATERAI` juga tidak wajib tersedia untuk semua produk.

## 2.4 Harga Jual

Harga jual disimpan pada master produk.

Harga jual dapat berubah ketika bisnis menetapkan harga baru.

Histori transaksi penjualan tetap menyimpan harga jual saat transaksi terjadi.

## 2.5 Harga Modal

Harga modal/unit dari pembelian dihitung:

```text
HARGA_MODAL_UNIT = NOMINAL / QTTY
```

Harga modal tidak diinput manual.

## 2.6 Pajak Pembelian

Pajak pembelian ditetapkan sebesar 11% dari nominal pembelian.

```text
PAJAK = NOMINAL × 11%
```

Total pembelian:

```text
TOTAL = NOMINAL + PAJAK
```

Untuk tahap awal, pajak tidak dimasukkan ke harga modal/unit.

## 2.7 Biaya Operasional

Biaya operasional dicatat terpisah dari harga modal produk.

Contoh:

- Gaji
- Listrik
- Air
- Internet
- BBM
- Sewa
- Servis kendaraan
- ATK
- Marketing
- Konsultan
- Pajak operasional
- Biaya lainnya

Biaya operasional tidak dibebankan ke batch FIFO pada tahap awal.

---

# 3. Teknologi yang Direkomendasikan

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

Untuk versi awal dapat menggunakan API route/server actions dari Next.js.

## Database

- Supabase
- PostgreSQL

## Authentication

- Supabase Auth

## Storage

- Supabase Storage jika diperlukan untuk:
  - Foto produk
  - Logo
  - Bukti pembayaran
  - Dokumen pembelian
  - Dokumen lainnya

## Deployment

Frontend:

- Vercel

Database/backend service:

- Supabase

Arsitektur:

```text
Admin
  ↓
Web Browser
  ↓
Next.js / React
  ↓
Supabase
  ├── PostgreSQL
  ├── Auth
  └── Storage
```

---

# 4. Struktur Modul Aplikasi

```text
Dashboard
│
├── Master Data
│   ├── Produk
│   ├── Supplier
│   ├── Karyawan
│   └── Kategori Biaya
│
├── Transaksi
│   ├── Pembelian
│   ├── Penjualan
│   ├── Operasional
│   └── Pembayaran Hutang
│
├── Persediaan
│   ├── Stok
│   ├── Batch
│   └── Mutasi Stok
│
├── Keuangan
│   ├── Kas/Bank
│   ├── Hutang Supplier
│   └── Laba Rugi
│
└── Laporan
    ├── Penjualan
    ├── Pembelian
    ├── Stok
    ├── Hutang
    ├── Operasional
    ├── Laba Rugi
    └── Arus Kas
```

---

# 5. Database Schema

## 5.1 `products`

Master produk.

| Field | Type | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| kode_produk | TEXT | Kode produk unik |
| merk | TEXT | Merk |
| kategori | TEXT | Kategori |
| type | TEXT nullable | Tipe produk |
| kode_baterai | TEXT nullable | Kode baterai |
| kapasitas_ah | NUMERIC | Kapasitas AH |
| harga_jual | NUMERIC | Harga jual aktif |
| qty_stok | NUMERIC | Stok terkini, sebaiknya dihitung/di-maintain dari transaksi |
| status | BOOLEAN | Aktif/nonaktif |
| created_at | TIMESTAMPTZ | Waktu dibuat |
| updated_at | TIMESTAMPTZ | Waktu diperbarui |

Catatan:

`qty_stok` tidak boleh menjadi satu-satunya sumber kebenaran stok. Sumber histori harus berasal dari mutasi/batch.

---

# 6. `suppliers`

Master distributor/supplier.

| Field | Type |
|---|---|
| id | UUID |
| kode_supplier | TEXT |
| nama_supplier | TEXT |
| alamat | TEXT |
| telepon | TEXT |
| email | TEXT nullable |
| status | BOOLEAN |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

---

# 7. `employees`

Master karyawan.

| Field | Type |
|---|---|
| id | UUID |
| kode_karyawan | TEXT |
| nama_karyawan | TEXT |
| jabatan | TEXT |
| gaji | NUMERIC |
| status | BOOLEAN |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

---

# 8. `expense_categories`

Master kategori biaya operasional.

Contoh:

```text
Gaji
Listrik
Air
Internet
BBM
Sewa
Servis
ATK
Marketing
Konsultan
Pajak
Lainnya
```

Field:

| Field | Type |
|---|---|
| id | UUID |
| kode_kategori | TEXT |
| nama_kategori | TEXT |
| status | BOOLEAN |
| created_at | TIMESTAMPTZ |

---

# 9. Pembelian

Karena satu pembelian dapat memiliki banyak produk, gunakan konsep header-detail.

## 9.1 `purchase_transactions`

Header pembelian.

| Field | Type | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| kode_pembelian | TEXT | Nomor pembelian |
| tanggal | DATE | Tanggal transaksi |
| supplier_id | UUID | FK supplier |
| nominal | NUMERIC | Total barang sebelum pajak |
| pajak | NUMERIC | 11% dari nominal |
| total | NUMERIC | Nominal + pajak |
| status_pembayaran | TEXT | LUNAS/HUTANG/PARSIAL |
| created_by | UUID | User |
| created_at | TIMESTAMPTZ | Waktu |

## 9.2 `purchase_items`

Detail produk pembelian.

| Field | Type |
|---|---|
| id | UUID |
| purchase_id | UUID |
| product_id | UUID |
| qty | NUMERIC |
| nominal | NUMERIC |
| harga_modal_unit | NUMERIC |
| created_at | TIMESTAMPTZ |

Formula:

```text
harga_modal_unit = nominal / qty
```

Produk tidak perlu menyimpan ulang merk, kategori, type, kode baterai, dan kapasitas sebagai input manual.

Data tersebut berasal dari `products`.

---

# 10. Batch FIFO

Ini merupakan komponen paling penting.

## `inventory_batches`

Setiap pembelian produk menghasilkan batch.

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| purchase_item_id | UUID |
| tanggal_masuk | DATE |
| qty_awal | NUMERIC |
| qty_tersedia | NUMERIC |
| harga_modal_unit | NUMERIC |
| created_at | TIMESTAMPTZ |

Contoh:

```text
Batch 001
Produk: AKI001
Tanggal: 10/08/2026
Qty awal: 10
Qty tersedia: 10
Harga modal: 500.000
```

Pembelian berikutnya:

```text
Batch 002
Produk: AKI001
Tanggal: 01/09/2026
Qty awal: 10
Qty tersedia: 10
Harga modal: 600.000
```

---

# 11. Logika FIFO

Saat penjualan terjadi, sistem mencari batch produk berdasarkan:

```text
tanggal_masuk ASC
```

Artinya batch tertua digunakan terlebih dahulu.

Contoh:

```text
Batch 001 → 10 unit × 500.000
Batch 002 → 10 unit × 600.000
```

Penjualan:

```text
12 unit
```

Maka:

```text
10 × 500.000 = 5.000.000
2 × 600.000 = 1.200.000
------------------------
HPP FIFO       6.200.000
```

Sisa stok:

```text
Batch 001 → 0
Batch 002 → 8
```

FIFO sebaiknya diproses secara transactional di database agar dua transaksi penjualan bersamaan tidak mengambil stok batch yang sama.

---

# 12. `inventory_movements`

Digunakan untuk mencatat histori pergerakan stok.

| Field | Type |
|---|---|
| id | UUID |
| product_id | UUID |
| batch_id | UUID nullable |
| movement_type | TEXT |
| reference_id | UUID |
| qty_in | NUMERIC |
| qty_out | NUMERIC |
| balance | NUMERIC nullable |
| transaction_date | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |

Jenis movement:

```text
PURCHASE
SALE
PURCHASE_RETURN
SALE_RETURN
ADJUSTMENT_IN
ADJUSTMENT_OUT
```

---

# 13. Penjualan

Gunakan header-detail.

## 13.1 `sales`

| Field | Type |
|---|---|
| id | UUID |
| kode_penjualan | TEXT |
| tanggal | TIMESTAMPTZ |
| customer_name | TEXT nullable |
| subtotal | NUMERIC |
| discount | NUMERIC |
| total | NUMERIC |
| payment_method | TEXT |
| created_by | UUID |
| created_at | TIMESTAMPTZ |

Tidak ada `customer_id`.

Customer hanya berupa nama pada transaksi jika diperlukan.

## 13.2 `sale_items`

| Field | Type |
|---|---|
| id | UUID |
| sale_id | UUID |
| product_id | UUID |
| qty | NUMERIC |
| harga_jual | NUMERIC |
| subtotal | NUMERIC |
| hpp_fifo | NUMERIC |
| laba_kotor | NUMERIC |
| created_at | TIMESTAMPTZ |

Formula:

```text
subtotal = qty × harga_jual
laba_kotor = subtotal - hpp_fifo
```

Harga jual harus disimpan pada transaksi agar histori tidak berubah jika harga jual master berubah.

---

# 14. Detail Alokasi FIFO

Untuk audit FIFO, sebaiknya dibuat tabel:

## `sale_batch_allocations`

| Field | Type |
|---|---|
| id | UUID |
| sale_item_id | UUID |
| batch_id | UUID |
| qty_used | NUMERIC |
| harga_modal_unit | NUMERIC |
| subtotal_hpp | NUMERIC |

Contoh:

```text
Sale Item
12 unit

Batch 001
10 unit × 500.000 = 5.000.000

Batch 002
2 unit × 600.000 = 1.200.000
```

Total:

```text
HPP = 6.200.000
```

Ini membuat sistem bisa menjelaskan dari batch mana HPP penjualan berasal.

---

# 15. Operasional

## `expenses`

| Field | Type |
|---|---|
| id | UUID |
| kode_pengeluaran | TEXT |
| tanggal | DATE |
| category_id | UUID |
| employee_id | UUID nullable |
| keterangan | TEXT |
| nominal | NUMERIC |
| payment_method | TEXT |
| created_by | UUID |
| created_at | TIMESTAMPTZ |

Contoh:

```text
Gaji        3.000.000
Listrik       500.000
BBM           300.000
Internet      250.000
```

Biaya ini tidak masuk ke batch FIFO.

---

# 16. Hutang Supplier

## `supplier_payments`

Mencatat pembayaran hutang.

| Field | Type |
|---|---|
| id | UUID |
| kode_pembayaran | TEXT |
| supplier_id | UUID |
| purchase_id | UUID nullable |
| tanggal | DATE |
| nominal | NUMERIC |
| payment_method | TEXT |
| keterangan | TEXT |
| created_by | UUID |
| created_at | TIMESTAMPTZ |

Hutang dihitung dari:

```text
Total pembelian kredit
-
Pembayaran supplier
=
Saldo hutang
```

Tidak ada hutang customer.

---

# 17. Kas/Bank

## `cash_transactions`

Semua transaksi yang memengaruhi kas/bank.

| Field | Type |
|---|---|
| id | UUID |
| tanggal | TIMESTAMPTZ |
| account_type | TEXT |
| transaction_type | TEXT |
| reference_type | TEXT |
| reference_id | UUID |
| debit | NUMERIC |
| credit | NUMERIC |
| description | TEXT |
| created_at | TIMESTAMPTZ |

Contoh transaksi:

```text
Penjualan tunai
→ Kas masuk

Pembayaran hutang
→ Kas keluar

Operasional
→ Kas keluar
```

Sebaiknya jangan meminta admin menginput transaksi kas yang sebenarnya sudah berasal dari transaksi lain secara manual. Sistem harus membuat transaksi kas secara otomatis dari transaksi sumber.

---

# 18. Relasi Database

Relasi utama:

```text
suppliers
    │
    └── purchase_transactions
            │
            └── purchase_items
                    │
                    └── products
                            │
                            └── inventory_batches
                                    │
                                    └── sale_batch_allocations
                                            │
                                            └── sale_items
                                                    │
                                                    └── sales
```

Relasi hutang:

```text
suppliers
    │
    ├── purchase_transactions
    │
    └── supplier_payments
```

Relasi operasional:

```text
expense_categories
        │
        └── expenses
                │
                └── employees (optional)
```

---

# 19. Dependent Product Selection

Pada web, pemilihan produk tidak menggunakan Excel Data Validation.

Form pembelian:

```text
Merk
  ↓
Kategori
  ↓
Type
  ↓
Kode Baterai
  ↓
Kapasitas
```

Data diambil dari `products`.

Contoh query:

```sql
SELECT DISTINCT kategori
FROM products
WHERE merk = 'Furukawa'
ORDER BY kategori;
```

Kemudian:

```sql
SELECT DISTINCT type
FROM products
WHERE merk = 'Furukawa'
  AND kategori = 'Maintenance Free'
  AND type IS NOT NULL
ORDER BY type;
```

Kemudian:

```sql
SELECT DISTINCT kode_baterai
FROM products
WHERE merk = 'Furukawa'
  AND kategori = 'Maintenance Free'
  AND (
      type = 'MF'
      OR type IS NULL
  )
ORDER BY kode_baterai;
```

Jika atribut tertentu kosong, UI tidak boleh memaksa user mengisinya.

Contoh:

```text
Merk: Yuasa
Kategori: Maintenance Free
Type: Tidak tersedia
Kode Baterai: YBX5000
Kapasitas: 45 AH
```

---

# 20. Validasi Produk

Walaupun UI menggunakan dropdown bertingkat, backend tetap harus memvalidasi `product_id`.

Jangan hanya mempercayai data dari frontend.

Saat transaksi dibuat:

```text
product_id
    ↓
cek products
    ↓
pastikan produk aktif
    ↓
ambil harga/modal yang diperlukan
```

---

# 21. Alur Pembelian

```text
Admin membuka Pembelian
        ↓
Input kode pembelian
        ↓
Pilih tanggal
        ↓
Pilih supplier
        ↓
Pilih produk
        ↓
Input QTY
        ↓
Input NOMINAL
        ↓
Sistem menghitung harga modal/unit
        ↓
Sistem menghitung pajak 11%
        ↓
Sistem menghitung total
        ↓
Simpan purchase transaction
        ↓
Buat purchase items
        ↓
Buat inventory batch
        ↓
Tambah stok
        ↓
Jika kredit → tambah hutang supplier
        ↓
Jika lunas → catat kas keluar
```

---

# 22. Alur Penjualan

```text
Admin membuka Penjualan
        ↓
Buat nomor bon
        ↓
Pilih produk
        ↓
Sistem menampilkan harga jual
        ↓
Input QTY
        ↓
Sistem cek stok
        ↓
Sistem mengambil batch FIFO
        ↓
Hitung HPP
        ↓
Hitung subtotal
        ↓
Hitung total
        ↓
Customer membayar
        ↓
Simpan penjualan
        ↓
Kurangi batch
        ↓
Catat mutasi stok
        ↓
Catat kas masuk
        ↓
Hitung laba kotor
```

---

# 23. Alur Operasional

```text
Admin
  ↓
Pilih kategori
  ↓
Input keterangan
  ↓
Input nominal
  ↓
Pilih metode pembayaran
  ↓
Simpan
  ↓
Catat biaya operasional
  ↓
Catat kas keluar
```

---

# 24. Laba Rugi

Struktur dasar:

```text
PENJUALAN
- HPP FIFO
----------------
LABA KOTOR

- BIAYA OPERASIONAL
----------------
LABA OPERASIONAL
```

Jika ada pendapatan/biaya lain, dapat ditambahkan kemudian.

Pajak pembelian tidak otomatis dianggap biaya operasional.

---

# 25. Arus Kas

Kas masuk:

```text
Penjualan
Pendapatan lainnya
```

Kas keluar:

```text
Pembelian tunai
Pembayaran hutang supplier
Biaya operasional
Pengeluaran lainnya
```

Perhitungan:

```text
Saldo Awal
+ Kas Masuk
- Kas Keluar
----------------
Saldo Akhir
```

---

# 26. Dashboard

Dashboard minimal menampilkan:

### Ringkasan

```text
Penjualan Hari Ini
Penjualan Bulan Ini
Laba Kotor
Laba Bersih
Stok Produk
Total Hutang Supplier
Saldo Kas/Bank
```

### Grafik

- Penjualan per bulan
- Laba per bulan
- Pembelian per bulan
- Pengeluaran operasional per kategori
- Produk terlaris

### Peringatan

- Produk stok rendah
- Hutang supplier jatuh tempo jika sistem jatuh tempo ditambahkan
- Transaksi gagal
- Stok tidak mencukupi

---

# 27. Role & Authentication

Minimal dua role:

## Admin

Bisa:

- Input pembelian
- Input penjualan
- Input operasional
- Melihat stok
- Membuat bon

## Owner

Bisa:

- Semua akses admin
- Melihat laporan
- Melihat laba rugi
- Melihat hutang
- Melihat arus kas
- Mengelola master
- Melihat dashboard

Jika diperlukan, role dapat dikembangkan menjadi:

```text
OWNER
ADMIN
KASIR
GUDANG
ACCOUNTING
```

---

# 28. Keamanan

Gunakan:

- Supabase Auth
- Row Level Security (RLS)
- Foreign key
- Database constraint
- Validasi server-side
- Transaction/database function untuk proses FIFO
- Audit log untuk transaksi penting

Jangan mengandalkan validasi frontend saja.

---

# 29. Audit Log

Sebaiknya dibuat tabel:

## `audit_logs`

Mencatat:

```text
User
Aksi
Tabel
Record ID
Data sebelum
Data sesudah
Timestamp
```

Contoh:

```text
Admin
UPDATE
Harga jual AKI001
550.000 → 575.000
11/08/2026 10:30
```

Ini penting untuk sistem keuangan.

---

# 30. Aturan Perubahan Data

Transaksi keuangan sebaiknya tidak boleh dihapus sembarangan.

Untuk transaksi yang sudah diposting:

```text
Draft
  ↓
Posted
```

Setelah `Posted`, sebaiknya:

- tidak boleh diedit bebas
- tidak boleh dihapus
- gunakan pembatalan/reversal jika ada kesalahan

Ini menjaga integritas stok, hutang, kas, dan laporan.

---

# 31. Status Transaksi

Pembelian:

```text
DRAFT
POSTED
CANCELLED
```

Penjualan:

```text
DRAFT
PAID
CANCELLED
```

Pengeluaran:

```text
DRAFT
POSTED
CANCELLED
```

---

# 32. Nomor Dokumen

Format yang disarankan:

```text
PB-202608-0001
PJ-202608-0001
OP-202608-0001
PH-202608-0001
```

Keterangan:

```text
PB = Pembelian
PJ = Penjualan
OP = Operasional
PH = Pembayaran Hutang
```

Nomor harus dibuat server-side agar tidak terjadi duplikasi ketika dua admin membuat transaksi bersamaan.

---

# 33. Master Produk

Data yang sudah ditetapkan:

```text
KODE_PRODUK
MERK
KATEGORI
TYPE
KODE_BATERAI
KAPASITAS
HARGA_JUAL
QTTY
```

Catatan:

`QTTY` sebaiknya tidak diedit manual dalam kondisi normal.

Stok berasal dari transaksi.

Jika terjadi selisih stok fisik:

```text
Stock Opname
    ↓
Adjustment
    ↓
Inventory Movement
```

---

# 34. Form Pembelian

Field:

```text
Kode Pembelian
Tanggal
Supplier

Detail Produk:
    Merk
    Kategori
    Type
    Kode Baterai
    Kapasitas
    QTTY
    Nominal
    Harga Modal/Unit
    Pajak
    Total
```

Perhitungan:

```text
Harga Modal/Unit = Nominal / QTTY
Pajak = Nominal × 11%
Total = Nominal + Pajak
```

---

# 35. Form Penjualan

Field:

```text
Kode Bon
Tanggal
Customer (opsional)

Detail:
    Produk
    QTY
    Harga Jual
    Diskon
    Subtotal
```

Sistem otomatis:

```text
Cek stok
↓
FIFO
↓
HPP
↓
Laba kotor
```

---

# 36. Prinsip Penting: Jangan Menyimpan Data Turunan Secara Berlebihan

Data seperti:

```text
Merk
Kategori
Type
Kode Baterai
Kapasitas
```

sebaiknya berasal dari `product_id`.

Harga jual transaksi tetap disimpan karena histori transaksi harus mempertahankan harga saat penjualan.

Harga modal FIFO disimpan pada batch.

HPP penjualan disimpan sebagai hasil alokasi batch.

---

# 37. MVP

Versi pertama jangan langsung membuat semua fitur.

Urutan MVP:

## Phase 1 — Database

- Setup Supabase
- Buat schema
- Buat tabel
- Foreign key
- Constraint
- RLS dasar

## Phase 2 — Authentication

- Login
- Role
- Session
- Logout

## Phase 3 — Master

- Produk
- Supplier
- Karyawan
- Kategori biaya

## Phase 4 — Pembelian

- Form pembelian
- Product selection
- Perhitungan nominal
- Pajak 11%
- Total
- Batch FIFO
- Stok
- Hutang supplier

## Phase 5 — Penjualan

- Form penjualan
- Cek stok
- FIFO
- HPP
- Laba
- Kas masuk
- Bon

## Phase 6 — Operasional

- Input biaya
- Kategori
- Kas keluar

## Phase 7 — Laporan

- Penjualan
- Pembelian
- Stok
- Hutang
- Operasional
- Laba rugi
- Arus kas

## Phase 8 — Dashboard

- KPI
- Grafik
- Ringkasan
- Alert

---

# 38. Urutan Development yang Disarankan

```text
1. Setup Git Repository
2. Setup Next.js
3. Setup Supabase
4. Buat database schema
5. Buat seed master data
6. Authentication
7. Layout dashboard
8. CRUD Produk
9. CRUD Supplier
10. CRUD Karyawan
11. CRUD Kategori
12. Modul Pembelian
13. Fungsi FIFO
14. Modul Stok
15. Modul Penjualan
16. Modul Hutang
17. Modul Operasional
18. Modul Kas/Bank
19. Laporan
20. Dashboard
21. Testing
22. Deployment
```

---

# 39. Testing yang Wajib

## Test Pembelian

```text
10 unit @500.000
→ batch 10 unit
→ modal 500.000
→ pajak 550.000
→ total 5.550.000
```

## Test Harga Naik

```text
Batch 1
10 unit @500.000

Batch 2
10 unit @600.000
```

## Test FIFO

Jual:

```text
12 unit
```

Hasil:

```text
10 × 500.000
2 × 600.000
```

## Test Stok

```text
20 unit masuk
12 unit keluar
= 8 unit
```

## Test Hutang

```text
Pembelian kredit 5.550.000
Bayar 2.000.000
Saldo hutang = 3.550.000
```

## Test Laba

```text
Penjualan
- HPP FIFO
= Laba Kotor

Laba Kotor
- Operasional
= Laba Bersih
```

---

# 40. Hal yang Tidak Perlu Dibuat di Versi Awal

Untuk menjaga sistem ringan, jangan dulu membuat:

- Marketplace
- Multi-cabang
- Loyalty customer
- CRM
- Piutang customer
- Integrasi payment gateway
- Integrasi pajak eksternal
- Akuntansi double-entry penuh
- Mobile app native
- Microservices
- Redis
- Docker
- VPS
- Elasticsearch

Fitur tersebut dapat ditambahkan jika kebutuhan bisnis berkembang.

---

# 41. Struktur Folder Next.js yang Disarankan

```text
src/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── produk/
│   ├── supplier/
│   ├── karyawan/
│   ├── kategori/
│   ├── pembelian/
│   ├── penjualan/
│   ├── operasional/
│   ├── hutang/
│   ├── stok/
│   └── laporan/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   └── dashboard/
│
├── lib/
│   ├── supabase/
│   ├── fifo/
│   ├── validation/
│   └── utils/
│
├── actions/
│   ├── purchases.ts
│   ├── sales.ts
│   ├── expenses.ts
│   └── payments.ts
│
└── types/
    └── database.ts
```

---

# 42. Prinsip Arsitektur

Gunakan prinsip:

```text
UI
 ↓
Server Action / API
 ↓
Business Logic
 ↓
Database
```

Jangan:

```text
UI
 ↓
langsung manipulasi database
```

Semua proses penting seperti:

- posting pembelian
- posting penjualan
- FIFO
- pembayaran hutang
- pencatatan kas

harus melewati business logic/server.

---

# 43. Prioritas Utama

Urutan fokus:

```text
1. Integritas database
2. Integritas stok
3. FIFO
4. Hutang supplier
5. Kas
6. HPP
7. Laba rugi
8. UI/UX
9. Dashboard
```

Jangan mendahulukan dashboard sebelum transaksi inti benar.

---

# 44. Target Akhir

Sistem harus mampu menjawab secara otomatis:

### Produk

> Berapa stok AKI001?

### FIFO

> Dari batch mana stok tersebut berasal?

### Penjualan

> Berapa omzet hari ini?

### HPP

> Berapa HPP transaksi penjualan tertentu?

### Laba

> Berapa laba kotor hari ini/bulan ini?

### Operasional

> Berapa biaya operasional bulan ini?

### Hutang

> Berapa hutang kepada setiap distributor?

### Kas

> Berapa saldo kas/bank?

### Owner

> Apakah bisnis menghasilkan laba?

---

# 45. Rekomendasi Implementasi Akhir

Stack:

```text
Next.js
+
TypeScript
+
Tailwind CSS
+
Supabase
+
PostgreSQL
+
Supabase Auth
+
Vercel
```

Untuk penggunaan ringan satu usaha, stack ini sudah memadai.

Fokus pengembangan:

```text
Database
→ Master
→ Pembelian
→ FIFO
→ Stok
→ Penjualan
→ Hutang
→ Operasional
→ Kas
→ Laporan
→ Dashboard
```

Sistem harus dibangun sebagai aplikasi transaksi yang memiliki **single source of truth**, yaitu database PostgreSQL. Excel dapat digunakan untuk ekspor laporan, backup manual, atau analisis tambahan, tetapi bukan sebagai database utama.
