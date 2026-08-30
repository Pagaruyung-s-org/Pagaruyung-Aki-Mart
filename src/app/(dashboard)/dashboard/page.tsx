import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import {
  ShoppingCart,
  Droplets,
  CircleDollarSign,
  BarChart3,
  Wallet,
  ArrowDownRight,
  AlertTriangle,
  Battery,
  Package,
  Banknote,
} from 'lucide-react'
import { getUserRole } from '@/actions/users'
import { SalesDashboardClient } from '@/components/dashboard/SalesDashboardClient'
import { HutangSupplierClient } from '@/components/dashboard/HutangSupplierClient'

async function getDashboardStats() {
  const supabase = await createClient()
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

  // Total hutang supplier & Details
  const { data: hutangDataFull } = await supabase
    .from('purchase_transactions')
    .select(`
      id,
      tanggal,
      tanggal_jatuh_tempo,
      nomor_faktur,
      total,
      suppliers (nama_supplier),
      supplier_payments (nominal)
    `)
    .in('status_pembayaran', ['HUTANG', 'PARSIAL'])
    .eq('status_transaksi', 'POSTED')

  const debtList = (hutangDataFull || []).map((p: any) => {
    const terbayar = p.supplier_payments?.reduce((s: number, pay: any) => s + (pay.nominal || 0), 0) || 0
    return {
      id: p.id,
      tanggal: p.tanggal,
      tanggal_jatuh_tempo: p.tanggal_jatuh_tempo,
      nomor_faktur: p.nomor_faktur,
      supplier_name: p.suppliers?.nama_supplier || 'Unknown',
      total: p.total,
      terbayar: terbayar,
      sisa_hutang: p.total - terbayar
    }
  }).filter((d: any) => d.sisa_hutang > 0)

  let totalHutang = debtList.reduce((s: number, d: any) => s + d.sisa_hutang, 0)



  // Produk aktif & stok
  const { data: activeProducts } = await supabase
    .from('products')
    .select('id, qty_stok, kategori')
    .eq('status', true)

  const produkAktif = activeProducts?.length ?? 0
  const produkAki = activeProducts?.filter((p: any) => p.kategori !== 'Air Aki').length ?? 0
  const produkAirAki = activeProducts?.filter((p: any) => p.kategori === 'Air Aki').length ?? 0
  const totalStokAki = activeProducts
    ?.filter((p: any) => p.kategori !== 'Air Aki')
    .reduce((sum, p) => sum + (p.qty_stok || 0), 0) ?? 0
  const totalStokAirAki = activeProducts
    ?.filter((p: any) => p.kategori === 'Air Aki')
    .reduce((sum, p) => sum + (p.qty_stok || 0), 0) ?? 0

  // Stok rendah
  const { data: stokRendah } = await supabase
    .from('products')
    .select('id, merk, kategori, kode_baterai, kapasitas_ah, qty_stok')
    .eq('status', true)
    .neq('kategori', 'Air Aki')
    .lt('qty_stok', 3)
    .order('qty_stok', { ascending: true })

  const { data: airAkiProducts } = await supabase
    .from('products')
    .select('id, merk, qty_stok')
    .eq('kategori', 'Air Aki')
    .eq('status', true)
    .order('qty_stok', { ascending: true })

  // Bulan ini: laba kotor, operasional, laba bersih
  const { data: monthSaleItems } = await supabase
    .from('sale_items')
    .select('laba_kotor, qty')
    .gte('created_at', firstDayOfMonth)

  const labaKotorBulanIni = monthSaleItems?.reduce((s, i) => s + i.laba_kotor, 0) ?? 0
  const totalAkiTerjualBulan = monthSaleItems?.reduce((s, i) => s + i.qty, 0) ?? 0

  const { data: opsData } = await supabase
    .from('expenses')
    .select('nominal')
    .gte('tanggal', firstDayOfMonth)
    .eq('status_transaksi', 'POSTED')
  const totalOps = opsData?.reduce((s, i) => s + i.nominal, 0) ?? 0
  const labaBersih = labaKotorBulanIni - totalOps

  // Omzet bulan ini
  const { data: monthSales } = await supabase
    .from('sales')
    .select('total')
    .eq('status_transaksi', 'PAID')
    .gte('tanggal', firstDayOfMonth)
  const omzetBulanIni = monthSales?.reduce((s, i) => s + i.total, 0) ?? 0

  // Total Nilai Stok
  const { data: batches } = await supabase
    .from('inventory_batches')
    .select('qty_tersedia, harga_modal_unit')
    .gt('qty_tersedia', 0)

  let totalNilaiStokAki = 0
  let totalNilaiStokAirAki = 0
  if (batches) {
    // Simple: sum all batches as aki stok value (air aki tracked separately via products)
    totalNilaiStokAki = batches.reduce((sum, b) => sum + (b.qty_tersedia * b.harga_modal_unit), 0)
  }

  // Sales for interactive chart (whole year)
  const { data: salesRaw } = await supabase
    .from('sales')
    .select('tanggal, total, payment_method, keterangan, sale_items(qty, laba_kotor, products(kategori))')
    .eq('status_transaksi', 'PAID')
    .gte('tanggal', firstDayOfYear)
    .order('tanggal', { ascending: true })

  // Saldo per akun (dinamis)
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, name, type, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: allLedger } = await supabase
    .from('cash_transactions')
    .select('account_id, debit, credit')

  const accountBalances: { id: string; name: string; type: string; saldo: number }[] = []
  for (const acc of (accountsData || [])) {
    const saldo = (allLedger || [])
      .filter(r => r.account_id === acc.id)
      .reduce((sum, r) => sum + (r.debit || 0) - (r.credit || 0), 0)
    accountBalances.push({ id: acc.id, name: acc.name, type: acc.type, saldo })
  }

  const totalSaldo = accountBalances.reduce((s, a) => s + a.saldo, 0)

  const salesData = (salesRaw ?? []).map(s => {
    const items = Array.isArray(s.sale_items) ? s.sale_items : []
    const qtyAki = items
      .filter((item: any) => item.products?.kategori !== 'Air Aki')
      .reduce((sum: number, item: any) => sum + item.qty, 0)
    const qtyAirAki = items
      .filter((item: any) => item.products?.kategori === 'Air Aki')
      .reduce((sum: number, item: any) => sum + item.qty, 0)
    const labaKotor = items.reduce((sum: number, item: any) => sum + (item.laba_kotor || 0), 0)
    return {
      tanggal: s.tanggal,
      total: s.total,
      total_qty: qtyAki + qtyAirAki,
      qty_aki: qtyAki,
      qty_air_aki: qtyAirAki,
      payment_method: s.payment_method,
      keterangan: s.keterangan,
      laba_kotor: labaKotor,
    }
  })

  // Expenses for interactive chart
  const { data: expensesRaw } = await supabase
    .from('expenses')
    .select('tanggal, nominal')
    .eq('status_transaksi', 'POSTED')
    .gte('tanggal', firstDayOfYear)

  const expensesData = (expensesRaw ?? []).map(e => ({ tanggal: e.tanggal, nominal: e.nominal }))

  return {
    // KPI bulan ini
    totalAkiTerjualBulan,
    omzetBulanIni,
    labaKotorBulanIni,
    totalOps,
    labaBersih,
    debtList,
    totalHutang,
    salesData,
    expensesData,
    totalSaldo,
    accountBalances,
    // Stok
    totalNilaiStokAki,
    totalNilaiStokAirAki,
    totalStokAki,
    totalStokAirAki,
    produkAktif,
    produkAki,
    produkAirAki,
    // Warning
    stokRendah: stokRendah ?? [],
    airAkiList: airAkiProducts ?? [],
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any
  label: string
  value: string
  sub?: string
  color: string
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-700', text: 'text-blue-900' },
    teal: { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-700', text: 'text-teal-900' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-700', text: 'text-violet-900' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-700', text: 'text-orange-900' },
    slate: { bg: 'bg-slate-50', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-900' },
    green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-900' },
    red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-700', text: 'text-red-900' },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <div className={`rounded-2xl ${c.bg} border border-white/60 shadow-sm p-5 flex items-center gap-4`}>
      <div className={`shrink-0 p-3 rounded-xl ${c.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <p className={`text-lg font-bold truncate ${c.text}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const [stats, role] = await Promise.all([getDashboardStats(), getUserRole()])

  const isLabaNegatif = stats.labaBersih < 0

  return (
    <div>
      <Header title="Dashboard" subtitle="Ringkasan bisnis usaha aki" />

      <div className="p-6 space-y-6 max-w-7xl w-full">

        {/* ── METRIC CARDS ─────────────────────────────────────────── */}
        {role !== 'ADMIN' && (
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={ShoppingCart}
              label="Aki terjual bulan ini"
              value={`${stats.totalAkiTerjualBulan} pcs`}
              color="blue"
            />
            <MetricCard
              icon={Droplets}
              label="Stok air aki"
              value={`${stats.totalStokAirAki} botol`}
              color="teal"
            />
            <MetricCard
              icon={CircleDollarSign}
              label="Omzet bulan ini"
              value={formatRupiah(stats.omzetBulanIni)}
              color="violet"
            />
            <MetricCard
              icon={BarChart3}
              label="Laba kotor bulan ini"
              value={formatRupiah(stats.labaKotorBulanIni)}
              color="orange"
            />
            <MetricCard
              icon={Wallet}
              label="Pengeluaran operasional"
              value={formatRupiah(stats.totalOps)}
              sub="Bulan ini"
              color="slate"
            />
            <MetricCard
              icon={isLabaNegatif ? ArrowDownRight : ArrowDownRight}
              label="Laba bersih bulan ini"
              value={formatRupiah(stats.labaBersih)}
              color={isLabaNegatif ? 'red' : 'green'}
            />
          </section>
        )}

        {/* ── CHART + SALDO PANEL ───────────────────────────────────── */}
        {role !== 'ADMIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesDashboardClient sales={stats.salesData} expenses={stats.expensesData} />
            </div>

            {/* Saldo Panel */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h2 className="font-semibold text-gray-900">Saldo Kas &amp; Bank</h2>
                <p className="text-xs text-gray-500 mt-0.5">Posisi saldo terkini</p>
              </div>
              <div className="mb-5">
                <p className="text-xs text-gray-400 font-medium">Total Saldo</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatRupiah(stats.totalSaldo)}</p>
              </div>
              <div className="space-y-3 flex-1">
                {stats.accountBalances.map((acc, i) => {
                  const isLast = i === stats.accountBalances.length - 1
                  const iconColors: Record<string, string> = {
                    KAS: 'bg-amber-100 text-amber-600',
                    BRANKAS: 'bg-emerald-100 text-emerald-600',
                    BANK: 'bg-blue-100 text-blue-600',
                  }
                  const iconColor = iconColors[acc.type] ?? 'bg-gray-100 text-gray-600'
                  const Icon = acc.type === 'KAS' ? Wallet : acc.type === 'BRANKAS' ? Battery : Banknote
                  return (
                    <div key={acc.id} className={`flex items-center justify-between py-2.5 ${isLast ? '' : 'border-b border-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{acc.name}</p>
                          <p className="text-[11px] text-gray-400">{acc.type === 'KAS' ? 'Kas tunai' : acc.type === 'BRANKAS' ? 'Simpanan toko' : 'Rekening bank'}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-gray-900">{formatRupiah(acc.saldo)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DAFTAR HUTANG SUPPLIER ───────────────────────────────── */}
        {role !== 'ADMIN' && (
          <section className="mt-6">
            <HutangSupplierClient data={stats.debtList} />
          </section>
        )}

        {/* ── INVENTORI SUMMARY ─────────────────────────────────────── */}
        {role !== 'ADMIN' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-gray-900">Ringkasan Inventori</h2>
                <p className="text-xs text-gray-500">Nilai dan ketersediaan stok produk</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Battery className="h-6 w-6 text-indigo-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Total nilai stok aki</p>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(stats.totalNilaiStokAki)}</p>
                  <p className="text-[11px] text-gray-400">Modal seluruh stok aki</p>
                </div>
                <span className="text-right shrink-0">
                  <span className="text-2xl font-bold text-gray-800">{stats.totalStokAki}</span>
                  <span className="text-xs text-gray-400 ml-1">pcs</span>
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                  <Droplets className="h-6 w-6 text-cyan-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Stok air aki</p>
                  <p className="text-lg font-bold text-gray-900">{stats.totalStokAirAki} botol</p>
                  <p className="text-[11px] text-gray-400">Semua jenis air aki</p>
                </div>
                <span className="text-right shrink-0">
                  <span className="text-2xl font-bold text-gray-800">{stats.totalStokAirAki}</span>
                  <span className="text-xs text-gray-400 ml-1">btl</span>
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                <span className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-gray-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Produk aktif</p>
                  <p className="text-lg font-bold text-gray-900">{stats.produkAktif} produk</p>
                  <p className="text-[11px] text-gray-400">{stats.produkAki} aki &amp; {stats.produkAirAki} air aki</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">Aktif</span>
              </div>
            </div>
          </section>
        )}

        {/* ── STOK WARNING TABLES ───────────────────────────────────── */}
        <div className={role === 'ADMIN' ? 'grid grid-cols-1 gap-6 flex-1' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>

          {/* Tabel Stok Aki */}
          <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col ${stats.stokRendah.length > 0 ? 'border-red-200' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${stats.stokRendah.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Battery className={`h-5 w-5 ${stats.stokRendah.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <div>
                  <h3 className={`font-semibold ${stats.stokRendah.length > 0 ? 'text-red-900' : 'text-gray-700'}`}>Stok Aki Menipis</h3>
                  <p className="text-xs text-gray-400">Segera lakukan restock</p>
                </div>
              </div>
              {stats.stokRendah.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{stats.stokRendah.length} Warning</span>
              )}
            </div>
            <div className="overflow-auto w-full flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Produk</th>
                    <th className="px-6 py-3 font-medium">Kategori</th>
                    <th className="px-6 py-3 font-medium text-center">Kode</th>
                    <th className="px-6 py-3 font-medium text-center">Sisa Stok</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.stokRendah.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Semua stok dalam batas aman.
                      </td>
                    </tr>
                  ) : (
                    stats.stokRendah.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-gray-900">{p.merk}</td>
                        <td className="px-6 py-3 text-gray-600">{p.kategori}</td>
                        <td className="px-6 py-3 text-center text-gray-600">{p.kode_baterai ?? '-'}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="font-bold text-red-600 text-lg">{p.qty_stok}</span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Menipis
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Stok Air Aki */}
          <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'border-red-200' : 'border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Droplets className={`h-5 w-5 ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'text-red-600' : 'text-gray-400'}`} />
                <div>
                  <h3 className={`font-semibold ${stats.airAkiList.some(p => (p.qty_stok ?? 0) < 20) ? 'text-red-900' : 'text-gray-700'}`}>Stok Air Aki</h3>
                  <p className="text-xs text-gray-400">Di bawah 20 botol = kritis</p>
                </div>
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
                    <th className="px-6 py-3 font-medium">Produk</th>
                    <th className="px-6 py-3 font-medium text-center">Stok</th>
                    <th className="px-6 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.airAkiList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Tidak ada produk Air Aki aktif.</td>
                    </tr>
                  ) : (
                    stats.airAkiList.map(p => {
                      const qty = p.qty_stok ?? 0
                      const isKritis = qty < 20
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{p.merk}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`font-bold text-lg ${isKritis ? 'text-red-600' : 'text-gray-900'}`}>{qty}</span>
                            <span className="text-xs text-gray-400 ml-1">btl</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isKritis ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Menipis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                Aman
                              </span>
                            )}
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
    </div>
  )
}
