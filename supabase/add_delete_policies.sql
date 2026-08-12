-- ============================================================
-- RLS Policy: DELETE untuk authenticated users
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Master Data (Supplier, Karyawan, Kategori Biaya)
CREATE POLICY "Authenticated users can delete" ON suppliers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON employees FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON expense_categories FOR DELETE TO authenticated USING (true);
