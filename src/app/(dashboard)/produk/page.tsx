import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ProdukTable } from '@/components/tables/ProdukTable'
import { Tabs } from '@/components/ui/Tabs'
import { getUserRole } from '@/actions/users'
import { BatteryCharging, Droplets } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProdukPage() {
  const supabase = await createClient()

  // Run independent queries concurrently
  const [role, { data: products }, { data: batches }] = await Promise.all([
    getUserRole(),
    supabase.from('products').select('*').order('merk', { ascending: true }).order('kategori', { ascending: true }).order('id', { ascending: true }),
    supabase.from('inventory_batches').select('product_id, harga_modal_unit, tanggal_masuk').order('created_at', { ascending: false })
  ])

  let productsWithModal = products ?? []

  if (role === 'SUPER_ADMIN' || role === 'OWNER') {
    // Map the latest harga_modal_unit to each product
    productsWithModal = productsWithModal.map((p) => {
      const pBatches = batches?.filter((b) => b.product_id === p.id) || []
      const latestBatch = pBatches[0] // ordered DESC by tanggal_masuk/created_at
      const oldestBatch = pBatches[pBatches.length - 1]

      return { 
        ...p, 
        modal: latestBatch ? latestBatch.harga_modal_unit : 0,
        modal_terbaru: latestBatch ? latestBatch.harga_modal_unit : 0,
        tgl_terbaru: latestBatch ? latestBatch.tanggal_masuk : null,
        modal_terlama: oldestBatch ? oldestBatch.harga_modal_unit : 0,
        tgl_terlama: oldestBatch ? oldestBatch.tanggal_masuk : null,
      }
    })
  }

  // Sort so that low stock (< 3) is at the top
  productsWithModal.sort((a, b) => {
    const aLow = a.qty_stok < 3 ? 1 : 0
    const bLow = b.qty_stok < 3 ? 1 : 0
    if (aLow !== bLow) {
      return bLow - aLow // 1 comes before 0
    }
    const merkCompare = a.merk.localeCompare(b.merk)
    if (merkCompare !== 0) return merkCompare
    return a.id.localeCompare(b.id)
  })
  // Separate by category
  const productsAki = productsWithModal.filter((p) => p.kategori !== 'Air Aki')
  const productsAirAki = productsWithModal.filter((p) => p.kategori === 'Air Aki')

  return (
    <div>
      <Header title="Master Produk" subtitle="Kelola data produk aki dan air aki" />
      <div className="p-6">
        <Tabs 
          tabs={[
            { id: 'aki', label: 'Master Aki', icon: <BatteryCharging className="w-4 h-4" /> },
            { id: 'air_aki', label: 'Master Air Aki', icon: <Droplets className="w-4 h-4" /> }
          ]}
          contents={{
            aki: <ProdukTable key="aki" products={productsAki as any} role={role} isAirAki={false} />,
            air_aki: <ProdukTable key="air_aki" products={productsAirAki as any} role={role} isAirAki={true} />
          }}
        />
      </div>
    </div>
  )
}
