import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { formatRupiah } from '@/lib/utils'
import { CreditCard, TrendingUp, Wallet, Package, AlertTriangle } from 'lucide-react'
import { getUserRole } from '@/actions/users'
import { SalesDashboardClient } from '@/components/dashboard/SalesDashboardClient'

async function getDashboardStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  // Total hutang supplier (pembelian HUTANG/PARSIAL)
  const { data: hutangData } = await supabase
    .from('purchase_transactions')
    .select('total, status_pembayaran, id')
    .in('status_pembayaran', ['HUTANG', 'PARSIAL'])
    .eq('status_transaksi', 'POSTED')

  let totalHutang = 0
  if (hutangData && hutangData.length > 0) {
    for (const p of hutangData) {
      const { data: payments } = await supabase
        .from('supplier_payments')
        .select('nominal')
        .eq('purchase_id', p.id)

      const paid = payments?.reduce((s, i) => s + i.nominal, 0) ?? 0
      totalHutang += Math.max(0, p.total - paid)
    }
  }

  // Saldo kas
  const { data: kasData } = await supabase
    .from('cash_transactions')
    .select('debit, credit')

  const saldoKas = kasData?.reduce((s, i) => s + i.debit - i.credit, 0) ?? 0

  // Jumlah produk aktif
  const { count: produkAktif } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('status', true)

  // Produk stok rendah (< 3) - User requested warning if below 3
  // Exclude "Air Aki" since it has its own separate table
  const { data: stokRendah } = await supabase
    .from('products')
    .select('id, merk, kategori, kode_baterai, kapasitas_ah, qty_stok')
    .eq('status', true)
    .neq('kategori', 'Air Aki')
    .lt('qty_stok', 3)
    .order('qty_stok', { ascending: true })

  // Laba Bersih Bulan Ini (Laba Kotor - Operasional)
  const { data: monthSaleItems } = await supabase
    .from('sale_items')
    .select('laba_kotor')
    .gte('created_at', firstDayOfMonth)
  const labaKotorBulanIni = monthSaleItems?.reduce((s, i) => s + i.laba_kotor, 0) ?? 0

  const { data: opsData } = await supabase
    .from('expenses')
    .select('nominal')
    .gte('tanggal', firstDayOfMonth)
    .eq('status_transaksi', 'POSTED')
  const totalOps = opsData?.reduce((s, i) => s + i.nominal, 0) ?? 0
  const labaBersih = labaKotorBulanIni - totalOps

  // Sales for the interactive client component (Fetch whole year)
  const { data: salesRaw } = await supabase
    .from('sales')
    .select('tanggal, total, sale_items(qty)')
    .eq('status_transaksi', 'PAID')
    .gte('tanggal', firstDayOfYear)
    .order('tanggal', { ascending: true })

  const salesData = (salesRaw ?? []).map(s => {
    // Supabase returns sale_items as an array of objects
    const totalQty = Array.isArray(s.sale_items) 
      ? s.sale_items.reduce((sum: number, item: any) => sum + item.qty, 0) 
      : 0
    return {
      tanggal: s.tanggal,
      total: s.total,
      total_qty: totalQty
    }
  })

  // Stok Air Aki (dari tabel products)
  const { data: airAkiProducts } = await supabase
    .from('products')
    .select('id, merk, qty_stok')
    .eq('kategori', 'Air Aki')
    .eq('status', true)
    .order('qty_stok', { ascending: true })

  return {
    labaBersih,
    totalHutang,
    saldoKas,
    produkAktif: produkAktif ?? 0,
    stokRendah: stokRendah ?? [],
    airAkiList: airAkiProducts ?? [],
    salesData,
  }
}

export default async function DashboardPage() {
  const [stats, role] = await Promise.all([
    getDashboardStats(),
    getUserRole()
  ])

  return (
    <div>
      <Header title="Dashboard" subtitle="Ringkasan bisnis usaha aki" />

      <div className={`p-6 space-y-6 max-w-7xl w-full ${role === 'ADMIN' ? 'h-[calc(100vh-100px)] flex flex-col' : ''}`}>
        
        {/* Global Summary KPI Cards */}
        {role !== 'ADMIN' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Laba Bersih Bulan Ini"
              value={formatRupiah(stats.labaBersih)}
              icon={<TrendingUp className="h-5 w-5" />}
              colorClass={stats.labaBersih >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}
            />
            <StatCard
              title="Total Hutang Supplier"
              value={formatRupiah(stats.totalHutang)}
              icon={<CreditCard className="h-5 w-5" />}
              colorClass="text-orange-600 bg-orange-50"
            />
            <StatCard
              title="Saldo Kas & Bank"
              value={formatRupiah(stats.saldoKas)}
              icon={<Wallet className="h-5 w-5" />}
              colorClass="text-cyan-600 bg-cyan-50"
            />
            <StatCard
              title="Total Produk Aktif"
              value={stats.produkAktif.toString()}
              subtitle="jenis produk"
              icon={<Package className="h-5 w-5" />}
              colorClass="text-indigo-600 bg-indigo-50"
            />
          </div>
        )}

        {/* Low Stock Warning Tables */}
        <div className={role === 'ADMIN' ? "grid grid-cols-1 grid-rows-2 gap-6 flex-1 min-h-0" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          <div className={role === 'ADMIN' ? "order-2 h-full min-h-0" : "lg:col-span-2"}>
            <div className={`bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col ${role === 'ADMIN' ? 'h-full' : 'h-[340px]'} ${stats.stokRendah.length > 0 ? 'border-red-200' : 'border-gray-200'}`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${stats.stokRendah.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${stats.stokRendah.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <h3 className={`font-semibold ${stats.stokRendah.length > 0 ? 'text-red-900' : 'text-gray-700'}`}>
                    Stok Aki
                  </h3>
                </div>
                {stats.stokRendah.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {stats.stokRendah.length} Warning
                  </span>
                )}
              </div>
              <div className="overflow-auto w-full flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Merk</th>
                      <th className="px-6 py-3 font-medium">Kategori</th>
                      <th className="px-6 py-3 font-medium text-center">Kode Baterai</th>
                      <th className="px-6 py-3 font-medium text-center">Kapasitas (AH)</th>
                      <th className="px-6 py-3 font-medium text-center">Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.stokRendah.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Semua stok produk saat ini dalam batas aman (tidak ada yang di bawah 3 pcs).
                        </td>
                      </tr>
                    ) : (
                      stats.stokRendah.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{p.merk}</td>
                          <td className="px-6 py-3 text-gray-600">{p.kategori}</td>
                          <td className="px-6 py-3 text-center text-gray-600">{p.kode_baterai ?? '-'}</td>
                          <td className="px-6 py-3 text-center text-gray-600">{p.kapasitas_ah ?? '-'}</td>
                          <td className="px-6 py-3 text-center">
                            <span className="font-bold text-red-600 text-lg">{p.qty_stok}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={role === 'ADMIN' ? "order-1 h-full min-h-0" : "lg:col-span-1"}>
            <div className={`bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col ${role === 'ADMIN' ? 'h-full' : 'h-[340px]'} ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'border-red-200' : 'border-gray-200'}`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'text-red-600' : 'text-gray-400'}`} />
                  <h3 className={`font-semibold ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'text-red-900' : 'text-gray-700'}`}>
                    Stok Air Aki
                  </h3>
                </div>
                {stats.airAkiList.filter(p => (p.qty_stok ?? 0) < 20).length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {stats.airAkiList.filter(p => (p.qty_stok ?? 0) < 20).length} Warning
                  </span>
                )}
              </div>
              <div className="overflow-auto w-full flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 font-medium text-center">Merk</th>
                      <th className="px-6 py-3 font-medium text-center">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.airAkiList.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          Tidak ada produk Air Aki aktif.
                        </td>
                      </tr>
                    ) : (
                      stats.airAkiList.map((p) => {
                        const qty = p.qty_stok ?? 0
                        const isKritis = qty < 20
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 font-medium text-gray-900 text-center">{p.merk}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={`font-bold ${isKritis ? 'text-red-600' : 'text-gray-900'}`}>{qty}</span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Sales Dashboard Component */}
        {role !== 'ADMIN' && (
          <SalesDashboardClient sales={stats.salesData} />
        )}

      </div>
    </div>
  )
}
