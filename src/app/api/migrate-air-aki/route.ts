import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: prods } = await supabase.from('products').select('*').eq('kategori', 'Air Aki');
  
  if (!prods) return NextResponse.json({ error: 'No products found' });

  let migrated = 0;
  for (const p of prods) {
    if (p.qty_stok > 0) {
      const { data: b } = await supabase.from('inventory_batches').select('*').eq('product_id', p.id);
      if (!b || b.length === 0) {
         console.log('Migrating', p.merk, 'qty:', p.qty_stok);
         await supabase.from('inventory_batches').insert({
            product_id: p.id,
            tanggal_masuk: new Date().toISOString(),
            qty_awal: p.qty_stok,
            qty_tersedia: p.qty_stok,
            harga_modal_unit: 0
         });
         migrated++;
      }
    }
  }

  return NextResponse.json({ success: true, migrated });
}
