export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah, formatDate } from '@/lib/utils'
import { FileText, PackagePlus, DollarSign, WalletCards, Search } from 'lucide-react'
import { PrintButton } from '@/components/ui/PrintButton'
import { PembelianReportTable } from '@/components/tables/reports/PembelianReportTable'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LaporanPembelianPage({ searchParams }: PageProps) {
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
  const { data: purchases } = await supabase
    .from('purchase_transactions')
    .select(`
      id, 
      kode_pembelian, 
      tanggal, 
      total, 
      status_pembayaran,
      suppliers ( nama_supplier ),
      purchase_items ( qty ),
      supplier_payments ( nominal )
    `)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .eq('status_transaksi', 'POSTED')
    .order('tanggal', { ascending: false })

  // Calculate Metrics
  let totalFaktur = 0
  let totalProdukMasuk = 0
  let totalPembelian = 0
  let totalSisaHutang = 0

  const tableData = (purchases || []).map(purchase => {
    totalFaktur++
    totalPembelian += purchase.total
    
    // Sum qty for this purchase
    let purchaseQty = 0
    purchase.purchase_items?.forEach((item: any) => {
      purchaseQty += item.qty
    })

    // Sum payments
    let sudahDibayar = 0
    purchase.supplier_payments?.forEach((payment: any) => {
      sudahDibayar += payment.nominal
    })

    const sisaHutang = purchase.total - sudahDibayar

    totalProdukMasuk += purchaseQty
    totalSisaHutang += sisaHutang

    const supp = purchase.suppliers as any
    return {
      ...purchase,
      supplier_name: supp?.nama_supplier || '-',
      total_qty: purchaseQty,
      sudah_dibayar: sudahDibayar,
      sisa_hutang: sisaHutang
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
        title="Laporan Pembelian" 
        subtitle="Analisa pengadaan stok dan hutang ke supplier" 
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
          <PrintButton label="Export PDF" href={`/api/pdf/pembelian?m=${filterMonth}&y=${filterYear}`} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Faktur</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{totalFaktur}</h3>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg w-fit">
              <PackagePlus className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Produk (Qty)</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{totalProdukMasuk}</h3>
            </div>
          </div>
          
          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg w-fit">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Pembelian</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{formatRupiah(totalPembelian)}</h3>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg w-fit">
              <WalletCards className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Sisa Hutang</p>
              <h3 className="text-xl font-bold text-red-700 truncate">{formatRupiah(totalSisaHutang)}</h3>
            </div>
          </div>
        </div>

        <PembelianReportTable data={tableData} />

      </div>
    </div>
  )
}
