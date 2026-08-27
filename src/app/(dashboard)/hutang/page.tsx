import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { CreditCard } from 'lucide-react'
import { HutangAktifTable } from '@/components/tables/HutangAktifTable'
import { HutangManualModal } from '@/components/forms/HutangManualModal'
import { getUserRole } from '@/actions/users'

export default async function HutangPage() {
  const supabase = await createClient()

  // Ambil semua pembelian dengan status hutang/parsial
  const { data: purchases } = await supabase
    .from('purchase_transactions')
    .select(`
      *,
      suppliers(nama_supplier, kode_supplier),
      supplier_payments(nominal)
    `)
    .in('status_pembayaran', ['HUTANG', 'PARSIAL'])
    .eq('status_transaksi', 'POSTED')
    .order('tanggal', { ascending: false })

  // Ambil data supplier untuk modal input hutang manual
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, nama_supplier')
    .eq('status', true)
    .order('nama_supplier')

  const role = await getUserRole()

  // Hitung saldo hutang per pembelian
  const hutangList = (purchases ?? []).map(p => {
    // @ts-ignore
    const totalPaid = p.supplier_payments?.reduce((s: number, sp: any) => s + sp.nominal, 0) ?? 0
    const saldoHutang = p.total - totalPaid
    return { ...p, totalPaid, saldoHutang }
  })

  const totalHutang = hutangList.reduce((s, p) => s + p.saldoHutang, 0)

  return (
    <div>
      <Header title="Hutang Supplier" subtitle="Ringkasan hutang kepada distributor" />
      <div className="p-6 space-y-4">
        {/* Total hutang */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-700 font-medium">Total Hutang Supplier</p>
              <p className="text-2xl font-bold text-orange-800">{formatRupiah(totalHutang)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-orange-600 font-medium">{hutangList.length} transaksi belum lunas</p>
            {role === 'SUPER_ADMIN' && <HutangManualModal suppliers={suppliers ?? []} />}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {hutangList.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Tidak ada hutang supplier aktif 🎉
            </div>
          ) : (
            <HutangAktifTable hutangList={hutangList} />
          )}
        </div>
      </div>
    </div>
  )
}
