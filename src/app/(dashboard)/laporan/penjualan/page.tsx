export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah, formatDate } from '@/lib/utils'
import { TrendingUp, Package, DollarSign, CreditCard, Search } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { PrintButton } from '@/components/ui/PrintButton'
import { PenjualanReportTable } from '@/components/tables/reports/PenjualanReportTable'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LaporanPenjualanPage({ searchParams }: PageProps) {
  const params = await searchParams

  const currentDate = new Date()
  const currentMonth = (currentDate.getMonth() + 1).toString()
  const currentYear = currentDate.getFullYear().toString()

  const filterMonth = typeof params.m === 'string' ? params.m : currentMonth
  const filterYear = typeof params.y === 'string' ? params.y : currentYear

  // Calculate start and end date of the selected month
  const startDate = new Date(Number(filterYear), Number(filterMonth) - 1, 1).toISOString()
  const endDate = new Date(Number(filterYear), Number(filterMonth), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()

  // Fetch data
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id, 
      kode_penjualan, 
      tanggal, 
      customer_name, 
      total, 
      discount, 
      payment_method,
      keterangan,
      sale_items ( qty, laba_kotor )
    `)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .eq('status_transaksi', 'PAID')
    .order('tanggal', { ascending: false })

  // Calculate Metrics
  let totalTransaksi = 0
  let totalProdukTerjual = 0
  let totalPenjualan = 0
  let totalLabaKotor = 0

  const tableData = (sales || []).map(sale => {
    totalTransaksi++
    totalPenjualan += sale.total

    // Sum qty and laba kotor for this sale
    let saleQty = 0
    let saleLabaKotor = 0
    sale.sale_items?.forEach((item: any) => {
      saleQty += item.qty
      saleLabaKotor += item.laba_kotor
    })

    totalProdukTerjual += saleQty
    totalLabaKotor += saleLabaKotor

    return {
      ...sale,
      total_qty: saleQty,
      total_laba: saleLabaKotor
    }
  })

  // Generate Year Options
  const yearOptions = []
  for (let y = currentDate.getFullYear(); y >= 2024; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header
        title="Laporan Penjualan"
        subtitle="Analisa performa dan riwayat penjualan"
      />

      <div className="p-6 space-y-6">

        {/* Filter Form */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-700">Filter Periode:</span>
            <form className="flex items-center gap-2">
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
          <PrintButton label="Export PDF" href={`/api/pdf/penjualan?m=${filterMonth}&y=${filterYear}`} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Transaksi</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalTransaksi}</h3>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg w-fit">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Produk Terjual (Qty)</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalProdukTerjual}</h3>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg w-fit">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Penjualan</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{formatRupiah(totalPenjualan)}</h3>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg w-fit">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Laba Kotor</p>
              <h3 className="text-xl font-bold text-purple-700 truncate">{formatRupiah(totalLabaKotor)}</h3>
            </div>
          </div>
        </div>

        <PenjualanReportTable data={tableData} />

      </div>
    </div>
  )
}
