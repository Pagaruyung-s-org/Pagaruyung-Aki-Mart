import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StokPageClient } from './StokPageClient'
import { getUserRole } from '@/actions/users'
import { getAkiBekasCategories, getAkiBekasSummary, getBankAkiBalance } from '@/actions/aki-bekas'

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

  // ─── Fetch data Aki Bekas ───
  const balance = await getBankAkiBalance()
  const categories = await getAkiBekasCategories()
  const summaryAkiBekas = await getAkiBekasSummary()

  const { data: purchases } = await supabase
    .from('aki_bekas_purchases')
    .select('*, sales(kode_penjualan)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: salesAkiBekas } = await supabase
    .from('aki_bekas_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: bankTransactions } = await supabase
    .from('bank_aki_bekas_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <Header title="Persediaan Stok" subtitle="Posisi stok produk dan air aki" />
      <div className="p-6">
        <StokPageClient
          products={products ?? []}
          batchByProduct={batchByProduct as any}
          role={role ?? undefined}
          akiBekasData={{
            initialBalance: balance,
            categories: categories || [],
            summary: summaryAkiBekas || [],
            purchases: purchases || [],
            sales: salesAkiBekas || [],
            bankTransactions: bankTransactions || []
          }}
        />
      </div>
    </div>
  )
}
