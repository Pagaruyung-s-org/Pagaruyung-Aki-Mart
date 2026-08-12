export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import { Search, ArrowDownCircle, ArrowUpCircle, Banknote } from 'lucide-react'
import { PrintButton } from '@/components/ui/PrintButton'
import { ArusKasReportTable } from '@/components/tables/reports/ArusKasReportTable'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LaporanArusKasPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const currentDate = new Date()
  const currentMonth = (currentDate.getMonth() + 1).toString()
  const currentYear = currentDate.getFullYear().toString()

  const filterMonth = typeof params.m === 'string' ? params.m : currentMonth
  const filterYear = typeof params.y === 'string' ? params.y : currentYear

  const startDate = new Date(Number(filterYear), Number(filterMonth) - 1, 1).toISOString()
  const endDate = new Date(Number(filterYear), Number(filterMonth), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()

  // Fetch cash transactions
  const { data: cashFlow } = await supabase
    .from('cash_transactions')
    .select('*')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: false })

  let totalUangMasuk = 0
  let totalUangKeluar = 0

  const tableData = (cashFlow || []).map(tx => {
    totalUangMasuk += tx.debit
    totalUangKeluar += tx.credit
    return tx
  })

  const netKas = totalUangMasuk - totalUangKeluar

  // Generate Year Options
  const yearOptions = []
  for (let y = currentDate.getFullYear(); y >= 2024; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header 
        title="Laporan Arus Kas" 
        subtitle="Analisa aliran uang tunai dan transfer masuk-keluar" 
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
          <PrintButton label="Export PDF" href={`/api/pdf/arus-kas?m=${filterMonth}&y=${filterYear}`} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <ArrowDownCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Kas Masuk</p>
              <h3 className="text-xl font-bold text-emerald-700 truncate">{formatRupiah(totalUangMasuk)}</h3>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg w-fit">
              <ArrowUpCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Kas Keluar</p>
              <h3 className="text-xl font-bold text-red-700 truncate">{formatRupiah(totalUangKeluar)}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <Banknote className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Net Kas Bulan Ini</p>
              <h3 className={`text-xl font-bold truncate ${netKas >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {netKas >= 0 ? '' : '-'}{formatRupiah(Math.abs(netKas))}
              </h3>
            </div>
          </div>
        </div>

        <ArusKasReportTable data={tableData} />

      </div>
    </div>
  )
}
