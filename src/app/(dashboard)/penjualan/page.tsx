import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/Badge'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Receipt } from 'lucide-react'
import { PenjualanModalButton } from '@/components/forms/PenjualanModal'
import { RiwayatPenjualanTable } from '@/components/tables/RiwayatPenjualanTable'

import { getUserRole } from '@/actions/users'

export default async function PenjualanPage() {
  const supabase = await createClient()

  const [role, { data: sales }, { data: products }, { data: batches }] = await Promise.all([
    getUserRole(),
    supabase
      .from('sales')
      .select(`
        *,
        sale_items(
          qty,
          harga_jual,
          subtotal,
          hpp_fifo,
          laba_kotor,
          products(*)
        )
      `)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('products').select('id, merk, kategori, type, kode_baterai, kapasitas_ah, kode_produk, harga_jual, qty_stok, status').order('merk').order('id', { ascending: true }),
    supabase.from('inventory_batches').select('product_id, harga_modal_unit').gt('qty_tersedia', 0).order('tanggal_masuk', { ascending: true })
  ])

  const modalMap: Record<string, number> = {}
  if (batches) {
    for (const b of batches) {
      if (!modalMap[b.product_id]) {
        modalMap[b.product_id] = b.harga_modal_unit
      }
    }
  }

  const productsWithModal = products?.map(p => ({
    ...p,
    harga_modal: modalMap[p.id] ?? 0
  })) ?? []

  return (
    <div>
      <Header title="Penjualan" subtitle="Daftar transaksi penjualan produk" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{sales?.length ?? 0} transaksi penjualan</p>
          {role !== 'OWNER' && (
            <PenjualanModalButton 
              type="aki" 
              products={productsWithModal}
              label="Buat Penjualan" 
              role={role}
            />
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {!sales || sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Belum ada transaksi penjualan</p>
              {role !== 'OWNER' && (
                <div className="mt-3">
                  <PenjualanModalButton 
                    type="aki" 
                    products={productsWithModal}
                    label="Buat Penjualan Pertama" 
                    role={role}
                  />
                </div>
              )}
            </div>
          ) : (
            <RiwayatPenjualanTable sales={sales} role={role} />
          )}
        </div>
      </div>
    </div>
  )
}
