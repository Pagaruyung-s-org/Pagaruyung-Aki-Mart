import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StokPageClient } from './StokPageClient'
import { getUserRole } from '@/actions/users'

export default async function StokPage() {
  const supabase = await createClient()

  // ─── Fetch data Stok Produk ───
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('status', true)
    .order('merk')
    .order('kategori')

  const role = await getUserRole()

  // Untuk setiap produk, ambil batch tersedia
  const productIds = (products ?? []).map(p => p.id)
  const { data: batches } = await supabase
    .from('inventory_batches')
    .select('id, product_id, qty_tersedia, harga_modal_unit, tanggal_masuk')
    .in('product_id', productIds.length > 0 ? productIds : ['_'])
    .gt('qty_tersedia', 0)
    .order('tanggal_masuk', { ascending: true })

  const batchByProduct: Record<string, typeof batches> = {}
  for (const b of batches ?? []) {
    if (!batchByProduct[b.product_id]) batchByProduct[b.product_id] = []
    batchByProduct[b.product_id]!.push(b)
  }

  return (
    <div>
      <Header title="Persediaan Stok" subtitle="Posisi stok produk dan air aki" />
      <div className="p-6">
        <StokPageClient
          products={products ?? []}
          batchByProduct={batchByProduct as any}
          role={role}
        />
      </div>
    </div>
  )
}
