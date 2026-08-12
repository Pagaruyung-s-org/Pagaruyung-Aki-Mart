# 🔋 Sistem Kedai Aki (Battery Shop ERP & POS)

Sistem Manajemen Penjualan, Pembelian, dan Keuangan lengkap yang dibangun khusus untuk mengelola operasional bengkel/toko aki. Aplikasi ini mencakup Point of Sales (POS), pelacakan stok, manajemen hutang supplier, hingga pembuatan laporan keuangan komprehensif.

## 🚀 Fitur Utama

- **📦 Point of Sales (POS)**: Kasir dengan perhitungan harga otomatis dan cetak struk (PDF).
- **🧮 Manajemen Inventaris & HPP (FIFO)**: Melacak stok masuk dan keluar beserta perhitungan Harga Pokok Penjualan dengan metode *First In, First Out*.
- **🤝 Manajemen Pembelian & Hutang Supplier**: Pencatatan barang masuk dari distributor, pelacakan status pembayaran (Lunas/Hutang/Parsial), dan riwayat cicilan.
- **💼 Pencatatan Operasional**: Melacak pengeluaran biaya operasional (Gaji, Listrik, Sewa, dll).
- **📊 Laporan Keuangan Otomatis (Export to PDF)**:
  - Laporan Penjualan & Pembelian
  - Laporan Hutang & Operasional
  - Laporan Laba Rugi (*Income Statement*)
  - Laporan Arus Kas (*Cash Flow*)
- **📈 Dashboard Interaktif**: Visualisasi metrik bisnis, grafik performa penjualan, tren laba bersih, dan peringatan stok menipis.

## 💻 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS (v4)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Security**: Supabase Auth & Row Level Security (RLS)
- **Icons**: Lucide React

## 📖 Dokumentasi Perancangan Sistem (System Design)

Proyek ini dirancang secara sistematis dari awal. Anda dapat melihat detail *business logic*, struktur relasi database, skema HPP FIFO, dan rancangan arsitektur lengkapnya pada dokumen berikut:
👉 [**Dokumen Perencanaan Sistem**](./docs/perencanaan_sistem_usaha_aki.md)

## 🛠️ Cara Menjalankan secara Lokal

1. **Clone repository ini**
   ```bash
   git clone https://github.com/username/sistem-kedai-aki.git
   cd sistem-kedai-aki
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Atur Environment Variables**
   Buat file `.env.local` di *root directory* dan masukkan kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---
*Dibuat untuk memecahkan masalah operasional nyata pada bisnis ritel otomotif.*
