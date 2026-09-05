export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import { PiutangTable } from '@/components/tables/PiutangTable'
import { Landmark } from 'lucide-react'

export default async function PiutangPage() {
  const supabase = await createClient()

  const [{ data: receivables }, { data: accounts }] = await Promise.all([
    supabase
      .from('customer_receivables')
      .select(`
        *,
        sales ( kode_penjualan ),
        customer_payments ( id, kode_pembayaran, tanggal, nominal, payment_method )
      `)
      .in('status_pembayaran', ['BELUM_LUNAS', 'PARSIAL'])
      .order('tanggal', { ascending: false }),
    supabase
      .from('accounts')
      .select('id, name, type')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const list = receivables ?? []
  const totalPiutang = list.reduce((s: number, r: any) => s + (r.sisa_piutang ?? 0), 0)

  return (
    <div>
      <Header title="Piutang Toko Pusat" subtitle="Tagihan penjualan ke toko pusat yang belum dilunasi" />
      <div className="p-6 space-y-4">
        {/* Summary card */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Landmark className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Total Piutang Belum Lunas</p>
              <p className="text-2xl font-bold text-orange-800">{formatRupiah(totalPiutang)}</p>
            </div>
          </div>
          <p className="text-sm text-orange-600 font-medium">{list.length} transaksi belum lunas</p>
        </div>

        <PiutangTable receivables={list} accounts={accounts ?? []} />
      </div>
    </div>
  )
}
