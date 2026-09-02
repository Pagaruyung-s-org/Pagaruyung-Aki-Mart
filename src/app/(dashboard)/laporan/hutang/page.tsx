export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { FileText, DollarSign, WalletCards, Search, Receipt } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { PrintButton } from '@/components/ui/PrintButton'
import { HutangReportTable } from '@/components/tables/reports/HutangReportTable'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LaporanHutangPage({ searchParams }: PageProps) {
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

  // Fetch payments for the selected month
  const { data: payments } = await supabase
    .from('supplier_payments')
    .select(`
      id,
      kode_pembayaran,
      tanggal,
      nominal,
      payment_method,
      keterangan,
      status_transaksi,
      suppliers ( nama_supplier ),
      purchase_transactions ( kode_pembelian )
    `)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .eq('status_transaksi', 'PAID')
    .order('tanggal', { ascending: false })

  // Fetch all active debts to calculate total Sisa Hutang (All Time)
  const { data: activeDebts } = await supabase
    .from('purchase_transactions')
    .select(`
      id,
      total,
      supplier_payments ( nominal )
    `)
    .eq('status_transaksi', 'POSTED')
    .neq('status_pembayaran', 'LUNAS')

  let totalSisaHutangAllTime = 0
  activeDebts?.forEach(debt => {
    let paid = 0
    debt.supplier_payments?.forEach((p: any) => {
      paid += p.nominal
    })
    totalSisaHutangAllTime += (debt.total - paid)
  })

  // Calculate Metrics for selected month
  let totalPembayaran = 0
  const frekuensiBayar = payments?.length || 0

  const tableData = (payments || []).map(payment => {
    totalPembayaran += payment.nominal
    const supp = payment.suppliers as any
    const purchase = payment.purchase_transactions as any
    return {
      ...payment,
      supplier_name: supp?.nama_supplier || '-',
      kode_pembelian: purchase?.kode_pembelian || '-'
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
        title="Laporan Hutang"
        subtitle="Riwayat pembayaran hutang ke supplier"
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
          <PrintButton label="Export PDF" href={`/api/pdf/hutang?m=${filterMonth}&y=${filterYear}`} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg w-fit">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Dibayar (Bulan Ini)</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{formatRupiah(totalPembayaran)}</h3>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Frekuensi Pembayaran</p>
              <h3 className="text-xl font-bold text-gray-900 truncate">{frekuensiBayar} <span className="text-sm font-normal text-gray-500">kali</span></h3>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg w-fit">
              <WalletCards className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500 mb-1">Sisa Hutang Berjalan (All-Time)</p>
              <h3 className="text-xl font-bold text-red-700 truncate">{formatRupiah(totalSisaHutangAllTime)}</h3>
            </div>
          </div>
        </div>

        <HutangReportTable data={tableData} />

      </div>
    </div>
  )
}
