-- ============================================================
-- SEED DATA — Sistem Kedai Aki
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. EXPENSE CATEGORIES (sudah ada dari schema.sql, ini tambahan jika perlu)
-- Jalankan hanya jika kategori belum ada
-- ============================================================
-- Cek dulu: SELECT * FROM expense_categories;
-- Jika sudah ada, skip bagian ini.

-- ============================================================
-- 2. SUPPLIERS
-- ============================================================
INSERT INTO suppliers (kode_supplier, nama_supplier, alamat, telepon, email, status) VALUES
('SUP-001', 'PT. Furukawa Indomobil Battery', 'Jl. Industri Raya No. 1, Tangerang', '021-5550001', 'furukawa@distributor.co.id', true),
('SUP-002', 'CV. Yuasa Battery Indonesia', 'Jl. Raya Bekasi KM 25, Bekasi', '021-5550002', 'yuasa@distributor.co.id', true),
('SUP-003', 'PT. GS Astra Motor', 'Jl. Sunter Jaya No. 7, Jakarta Utara', '021-5550003', NULL, true)
ON CONFLICT (kode_supplier) DO NOTHING;

-- ============================================================
-- 3. EMPLOYEES
-- ============================================================
INSERT INTO employees (kode_karyawan, nama_karyawan, jabatan, gaji, status) VALUES
('KRY-001', 'Budi Santoso', 'Kasir', 3000000, true),
('KRY-002', 'Siti Rahayu', 'Admin', 3500000, true),
('KRY-003', 'Ahmad Fauzi', 'Kepala Toko', 5000000, true)
ON CONFLICT (kode_karyawan) DO NOTHING;

-- ============================================================
-- 4. PRODUCTS
-- Format: kode_produk, merk, kategori, type (null jika tidak ada),
--         kode_baterai (null jika tidak ada), kapasitas_ah,
--         harga_jual, qty_stok (0 = stok dari pembelian), status
-- ============================================================
INSERT INTO products (kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah, harga_jual, qty_stok, status) VALUES

-- FURUKAWA
('AKI-FRK-001', 'Furukawa', 'Maintenance Free', 'MF',  'FB900',   45,   750000, 0, true),
('AKI-FRK-002', 'Furukawa', 'Maintenance Free', 'MF',  'FB1000',  50,   820000, 0, true),
('AKI-FRK-003', 'Furukawa', 'Maintenance Free', 'MF',  'FB1200',  60,   950000, 0, true),
('AKI-FRK-004', 'Furukawa', 'Maintenance Free', 'MF',  'FB1500',  70,  1100000, 0, true),
('AKI-FRK-005', 'Furukawa', 'Wet Battery',      'WB',  'WB500',   38,   650000, 0, true),

-- YUASA
('AKI-YUA-001', 'Yuasa',    'Maintenance Free', NULL,  'YBX5000', 45,   780000, 0, true),
('AKI-YUA-002', 'Yuasa',    'Maintenance Free', NULL,  'YBX5500', 55,   900000, 0, true),
('AKI-YUA-003', 'Yuasa',    'Maintenance Free', NULL,  'YBX7200', 72,  1200000, 0, true),
('AKI-YUA-004', 'Yuasa',    'Wet Battery',      NULL,  'YB700',   38,   620000, 0, true),

-- GS (Global Yuasa)
('AKI-GS-001',  'GS',       'Maintenance Free', 'MF',  'NS70',    55,   870000, 0, true),
('AKI-GS-002',  'GS',       'Maintenance Free', 'MF',  'NS40Z',   35,   650000, 0, true),
('AKI-GS-003',  'GS',       'Wet Battery',      NULL,  'GTZ5S',   30,   580000, 0, true)

ON CONFLICT (kode_produk) DO NOTHING;

-- ============================================================
-- CEK HASIL
-- ============================================================
SELECT 'suppliers' as tabel, COUNT(*) as jumlah FROM suppliers
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories;
