export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { PrintButton } from '@/components/ui/PrintButton'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LaporanLabaRugiPage({ searchParams }: PageProps) {
  const params = await searchParams

  const currentDate = new Date()
  const currentMonth = (currentDate.getMonth() + 1).toString()
  const currentYear = currentDate.getFullYear().toString()

  const filterMonth = typeof params.m === 'string' ? params.m : currentMonth
  const filterYear = typeof params.y === 'string' ? params.y : currentYear
  const currentTab = typeof params.tab === 'string' ? params.tab : 'utama'

  const startDate = new Date(Number(filterYear), Number(filterMonth) - 1, 1).toISOString()
  const endDate = new Date(Number(filterYear), Number(filterMonth), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()

  // --- DATA UNTUK TOKO UTAMA ---
  let pendapatanKotor = 0
  let totalDiskon = 0
  let totalHPP = 0
  let labaKotor = 0
  let bebanOperasional = 0

  if (currentTab === 'utama') {
    // 1. Fetch Sales (Pendapatan & HPP)
    const { data: sales } = await supabase
      .from('sales')
      .select(`
        total,
        discount,
        sale_items ( subtotal, hpp_fifo, laba_kotor )
      `)
      .eq('status_transaksi', 'PAID')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    sales?.forEach(sale => {
      pendapatanKotor += (sale.total + (sale.discount || 0)) // Total before discount
      totalDiskon += (sale.discount || 0)

      sale.sale_items?.forEach((item: any) => {
        totalHPP += (item.hpp_fifo || 0)
        labaKotor += (item.laba_kotor || 0)
      })
    })

    // 2. Fetch Expenses (Beban Operasional)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('nominal')
      .eq('status_transaksi', 'POSTED')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    expenses?.forEach(exp => {
      bebanOperasional += exp.nominal
    })
  }

  const pendapatanBersih = pendapatanKotor - totalDiskon
  const recalculatedLabaKotor = pendapatanBersih - totalHPP
  const labaBersih = recalculatedLabaKotor - bebanOperasional
  const isProfit = labaBersih >= 0

  // --- DATA UNTUK AKI BEKAS ---
  let pendapatanKotorAB = 0
  let totalHppAB = 0

  if (currentTab === 'aki-bekas') {
    const { data: abSales } = await supabase
      .from('aki_bekas_sales')
      .select('total, hpp_total')
      .eq('status', 'POSTED')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    abSales?.forEach(s => {
      pendapatanKotorAB += (s.total || 0)
      totalHppAB += (s.hpp_total || 0)
    })
  }

  const labaBersihAB = pendapatanKotorAB - totalHppAB
  const isProfitAB = labaBersihAB >= 0

  // Generate Year Options
  const yearOptions = []
  for (let y = currentDate.getFullYear(); y >= 2024; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header
        title="Laporan Laba Rugi"
        subtitle="Analisa keuntungan dan kerugian (Profit & Loss)"
      />

      <div className="p-6 space-y-6">

        {/* Filter Form */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-700">Filter Periode:</span>
            <form className="flex items-center gap-2">
              <input type="hidden" name="tab" value={currentTab} />
              <Select
                name="m"
                defaultValue={filterMonth}
                className="w-36"
                options={[
                  { value: "1", label: "Januari" },
                  { value: "2", label: "Februari" },
                  { value: "3", label: "Maret" },
                  { value: "4", label: "April" },
                  { value: "5", label: "Mei" },
                  { value: "6", label: "Juni" },
                  { value: "7", label: "Juli" },
                  { value: "8", label: "Agustus" },
                  { value: "9", label: "September" },
                  { value: "10", label: "Oktober" },
                  { value: "11", label: "November" },
                  { value: "12", label: "Desember" }
                ]}
              />

              <Select
                name="y"
                defaultValue={filterYear}
                className="w-24"
                options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
              />

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" /> Tampilkan
              </button>
            </form>
          </div>
          <PrintButton label="Export PDF" href={`/api/pdf/laba-rugi?m=${filterMonth}&y=${filterYear}&tab=${currentTab}`} />
        </div>

        <div className="max-w-4xl mx-auto w-full space-y-6">

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <Link
              href={`/laporan/laba-rugi?m=${filterMonth}&y=${filterYear}&tab=utama`}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${currentTab === 'utama' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Toko Utama
            </Link>
            <Link
              href={`/laporan/laba-rugi?m=${filterMonth}&y=${filterYear}&tab=aki-bekas`}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${currentTab === 'aki-bekas' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Aki Bekas
            </Link>
          </div>

          {/* Statement View */}
          {currentTab === 'utama' && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Statement Laba Rugi (Toko Utama)</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">
                    Margin: {pendapatanBersih > 0 ? ((labaBersih / pendapatanBersih) * 100).toFixed(1) : 0}%
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isProfit ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {isProfit ? 'PROFIT' : 'RUGI'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* 1. Pendapatan */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Pendapatan</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Penjualan Kotor</span>
                      <span>{formatRupiah(pendapatanKotor)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Diskon Penjualan</span>
                      <span className="text-red-500">({formatRupiah(totalDiskon)})</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900 pt-3 border-t border-gray-100">
                      <span>Pendapatan Bersih</span>
                      <span>{formatRupiah(pendapatanBersih)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. HPP */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Harga Pokok Penjualan (HPP)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Harga Pokok Penjualan (HPP FIFO)</span>
                      <span className="text-red-500">({formatRupiah(totalHPP)})</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900 pt-3 border-t border-gray-100">
                      <span>Laba Kotor</span>
                      <span className="text-blue-600">{formatRupiah(recalculatedLabaKotor)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Beban */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Beban Operasional</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Total Biaya Operasional</span>
                      <span className="text-red-500">({formatRupiah(bebanOperasional)})</span>
                    </div>
                  </div>
                </div>

                {/* 4. Laba Bersih */}
                <div className={`p-4 rounded-lg flex justify-between items-center ${isProfit ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`font-bold text-lg ${isProfit ? 'text-green-800' : 'text-red-800'}`}>
                    Laba Bersih
                  </span>
                  <span className={`font-bold text-xl ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                    {isProfit ? '' : '-'}{formatRupiah(Math.abs(labaBersih))}
                  </span>
                </div>

              </div>
            </div>
          )}

          {currentTab === 'aki-bekas' && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-900">Statement Laba Rugi (Aki Bekas)</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-emerald-700">
                    Margin: {pendapatanKotorAB > 0 ? ((labaBersihAB / pendapatanKotorAB) * 100).toFixed(1) : 0}%
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isProfitAB ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {isProfitAB ? 'PROFIT' : 'RUGI'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* 1. Pendapatan */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Pendapatan</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Penjualan Kotor Aki Bekas</span>
                      <span>{formatRupiah(pendapatanKotorAB)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900 pt-3 border-t border-gray-100">
                      <span>Pendapatan Bersih</span>
                      <span>{formatRupiah(pendapatanKotorAB)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. HPP */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Harga Pokok Penjualan (HPP)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4">
                      <span>Modal Pembelian Aki Bekas (HPP)</span>
                      <span className="text-red-500">({formatRupiah(totalHppAB)})</span>
                    </div>
                    <div className="flex justify-between font-medium text-gray-900 pt-3 border-t border-gray-100">
                      <span>Laba Kotor</span>
                      <span className="text-emerald-600">{formatRupiah(labaBersihAB)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Beban */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Beban Operasional</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 pl-4 italic">
                      <span>(Tidak ada beban operasional, ditanggung Toko Utama)</span>
                      <span className="text-gray-400">Rp 0</span>
                    </div>
                  </div>
                </div>

                {/* 4. Laba Bersih */}
                <div className={`p-4 rounded-lg flex justify-between items-center ${isProfitAB ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`font-bold text-lg ${isProfitAB ? 'text-emerald-800' : 'text-red-800'}`}>
                    Laba Bersih Aki Bekas
                  </span>
                  <span className={`font-bold text-xl ${isProfitAB ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isProfitAB ? '' : '-'}{formatRupiah(Math.abs(labaBersihAB))}
                  </span>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
