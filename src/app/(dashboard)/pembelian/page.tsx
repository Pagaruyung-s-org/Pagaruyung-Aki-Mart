import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/Badge'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'
import { PembelianModalButton } from '@/components/forms/PembelianModal'
import { RiwayatPembelianTable } from '@/components/tables/RiwayatPembelianTable'

import { getUserRole } from '@/actions/users'

export default async function PembelianPage() {
  const supabase = await createClient()

  const [role, { data: purchases }, { data: suppliers }, { data: products }] = await Promise.all([
    getUserRole(),
    supabase
      .from('purchase_transactions')
      .select(`
        *,
        suppliers(nama_supplier),
        purchase_items(
          qty, 
          nominal,
          product_id,
          products(merk, kategori, type, kode_baterai, kapasitas_ah)
        )
      `)
      .order('tanggal', { ascending: false })
      .limit(100),
    supabase.from('suppliers').select('id, nama_supplier, kode_supplier').eq('status', true).order('nama_supplier'),
    supabase.from('products').select('id, merk, kategori, type, kode_baterai, kapasitas_ah, kode_produk, harga_jual').eq('status', true).order('merk'),
  ])

  return (
    <div>
      <Header title="Pembelian" subtitle="Daftar transaksi pembelian produk" />
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{purchases?.length ?? 0} transaksi</p>
            {role !== 'OWNER' && (
              <PembelianModalButton 
                type="aki" 
                suppliers={suppliers ?? []} 
                products={products ?? []} 
                label="Buat Pembelian" 
                role={role ?? undefined}
              />
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {!purchases || purchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Belum ada transaksi pembelian</p>
                {role !== 'OWNER' && (
                  <div className="mt-3">
                    <PembelianModalButton 
                      type="aki" 
                      suppliers={suppliers ?? []} 
                      products={products ?? []} 
                      label="Buat Pembelian Pertama" 
                      role={role ?? undefined}
                    />
                  </div>
                )}
              </div>
            ) : (
              <RiwayatPembelianTable purchases={purchases} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
