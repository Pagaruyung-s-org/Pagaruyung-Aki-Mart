export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { PrintButton } from '@/components/ui/PrintButton'

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

  const startDate = new Date(Number(filterYear), Number(filterMonth) - 1, 1).toISOString()
  const endDate = new Date(Number(filterYear), Number(filterMonth), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()

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

  let pendapatanKotor = 0
  let totalDiskon = 0
  let totalHPP = 0
  let labaKotor = 0

  sales?.forEach(sale => {
    pendapatanKotor += (sale.total + (sale.discount || 0)) // Total before discount
    totalDiskon += (sale.discount || 0)
    
    sale.sale_items?.forEach((item: any) => {
      totalHPP += (item.hpp_fifo || 0)
      labaKotor += (item.laba_kotor || 0)
    })
  })
  
  // Recalculate Laba Kotor (just to be safe)
  const pendapatanBersih = pendapatanKotor - totalDiskon
  const recalculatedLabaKotor = pendapatanBersih - totalHPP

  // 2. Fetch Expenses (Beban Operasional)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('nominal')
    .eq('status_transaksi', 'POSTED')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)

  let bebanOperasional = 0
  expenses?.forEach(exp => {
    bebanOperasional += exp.nominal
  })

  // 3. Laba Bersih
  const labaBersih = recalculatedLabaKotor - bebanOperasional
  const isProfit = labaBersih >= 0

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
              <select 
                name="m" 
                defaultValue={filterMonth}
                className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
              >
                <option value="1">Januari</option>
                <option value="2">Februari</option>
                <option value="3">Maret</option>
                <option value="4">April</option>
                <option value="5">Mei</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">Agustus</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              
              <select 
                name="y" 
                defaultValue={filterYear}
                className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="h-4 w-4" /> Tampilkan
              </button>
            </form>
          </div>
          <PrintButton label="Export PDF" href={`/api/pdf/laba-rugi?m=${filterMonth}&y=${filterYear}`} />
        </div>

        <div className="max-w-4xl mx-auto w-full">
          
          {/* Statement View */}
          <div className="space-y-4">
            
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Statement Laba Rugi</h3>
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
            
          </div>
        </div>

      </div>
    </div>
  )
}
