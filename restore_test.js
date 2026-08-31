const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://grolnexeugpxjabnkjgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2xuZXhldWdweGphYm5ramdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY3NjQ5NSwiZXhwIjoyMTAyMjUyNDk1fQ.mcLWXRbpjPCEcWmgSLCvy4_ai77yqhboWJanN2Cms5Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  console.log('Restoring test data...');
  const kasAccountId = 'b40f24e5-08ec-4a63-a65b-e398fef44430'; // Dari hasil check database sebelumnya

  // 1. Give 100,000,000 to Kas
  await supabase.from('cash_transactions').insert({
    tanggal: new Date().toISOString(),
    account_id: kasAccountId,
    account_type: 'KAS',
    transaction_type: 'DEBIT',
    reference_type: 'OPENING_BALANCE',
    debit: 100000000,
    credit: 0,
    description: 'Restore Kas Awal (Kompensasi Reset)',
  });

  // 2. Cek produk yang stoknya 0, lalu set 50 stock for those
  const { data: products } = await supabase.from('products').select('id, harga_jual, qty_stok');
  const dummyQty = 50;

  const emptyProducts = products.filter(p => p.qty_stok === 0);
  console.log(`Mengisi ulang stok untuk ${emptyProducts.length} produk...`);

  for (const p of emptyProducts) {
    const hargaModal = Math.floor(p.harga_jual * 0.7); // Harga modal sekitar 70% dari harga jual
    
    // Add inventory movement
    await supabase.from('inventory_movements').insert({
      product_id: p.id,
      movement_type: 'OPENING_BALANCE',
      reference_type: 'OPENING_BALANCE',
      qty_in: dummyQty,
      qty_out: 0,
      transaction_date: new Date().toISOString(),
      keterangan: 'Restore Stok Awal (Kompensasi Reset)'
    });
    
    // Add batch
    await supabase.from('inventory_batches').insert({
      product_id: p.id,
      tanggal_masuk: new Date().toISOString(),
      qty_awal: dummyQty,
      qty_tersedia: dummyQty,
      harga_modal_unit: hargaModal
    });
    
    // Update product stock
    await supabase.from('products').update({ qty_stok: dummyQty }).eq('id', p.id);
  }
  
  console.log('Restore complete!');
}

restore();
