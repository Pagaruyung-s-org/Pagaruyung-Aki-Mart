const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://grolnexeugpxjabnkjgr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2xuZXhldWdweGphYm5ramdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY3NjQ5NSwiZXhwIjoyMTAyMjUyNDk1fQ.mcLWXRbpjPCEcWmgSLCvy4_ai77yqhboWJanN2Cms5Y');

async function audit() {
  console.log('--- 1. AUDIT STOK PRODUK VS BATCH VS MOVEMENTS ---');
  const { data: products } = await supabase.from('products').select('id, kode_produk, merk, qty_stok');
  
  let mismatchCount = 0;
  for (const p of products) {
    const { data: batches } = await supabase.from('inventory_batches').select('qty_tersedia').eq('product_id', p.id);
    const sumBatches = batches.reduce((sum, b) => sum + b.qty_tersedia, 0);
    
    const { data: movements } = await supabase.from('inventory_movements').select('qty_in, qty_out').eq('product_id', p.id);
    const sumMovements = movements.reduce((sum, m) => sum + m.qty_in - m.qty_out, 0);

    if (p.qty_stok !== sumBatches || p.qty_stok !== sumMovements) {
      console.log('MISMATCH: ' + p.kode_produk + ' (' + p.merk + ') -> Produk: ' + p.qty_stok + ', Batches: ' + sumBatches + ', Movements: ' + sumMovements);
      mismatchCount++;
    }
  }
  if (mismatchCount === 0) console.log('SEMUA PRODUK SINKRON (Produk = Batches = Movements)');

  console.log('\n--- 2. AUDIT TIMELINE (Opening Balance -> Sale -> Opname -> Sale) ---');
  const { data: timeline } = await supabase.from('inventory_movements').select('*, products(kode_produk)').order('transaction_date', { ascending: true });
  
  const opnames = timeline.filter(t => t.movement_type === 'STOCK_OPNAME');
  console.log('Ditemukan ' + opnames.length + ' aktivitas Stock Opname.');
  for (const op of opnames) {
    console.log('- ' + op.transaction_date + ': ' + op.keterangan + ' | In: ' + op.qty_in + ', Out: ' + op.qty_out);
  }

  console.log('\n--- 3. AUDIT VOID TRANSACTIONS ---');
  const { data: sales } = await supabase.from('sales').select('id, kode_penjualan, status_transaksi, total, created_at');
  const voidSales = sales.filter(s => s.status_transaksi === 'VOID');
  console.log('Ditemukan ' + voidSales.length + ' penjualan VOID.');

  for (const vs of voidSales) {
    // Cek apakah ada cash transaction yang merevert ini
    const { data: cash } = await supabase.from('cash_transactions').select('*').eq('reference_id', vs.id).eq('reference_type', 'SALE');
    const isReverted = cash.some(c => c.description.includes('VOID') || c.description.includes('Reversal') || c.description.includes('Batal'));
    console.log('Sale VOID ' + vs.kode_penjualan + ': ' + cash.length + ' baris kas. Reverted in kas? ' + isReverted);
  }

  const { data: purchases } = await supabase.from('purchase_transactions').select('id, kode_pembelian, status_transaksi');
  const voidPurchases = purchases.filter(p => p.status_transaksi === 'VOID');
  console.log('Ditemukan ' + voidPurchases.length + ' pembelian VOID.');

  for (const vp of voidPurchases) {
    const { data: cash } = await supabase.from('cash_transactions').select('*').eq('reference_id', vp.id).eq('reference_type', 'PURCHASE');
    const isReverted = cash.some(c => c.description.includes('VOID') || c.description.includes('Reversal') || c.description.includes('Batal'));
    console.log('Purchase VOID ' + vp.kode_pembelian + ': ' + cash.length + ' baris kas. Reverted in kas? ' + isReverted);
  }
}
audit();
