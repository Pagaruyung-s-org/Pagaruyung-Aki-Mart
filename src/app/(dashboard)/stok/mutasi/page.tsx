export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MutasiStokTable } from '@/components/tables/reports/MutasiStokTable'
import { PackageSearch } from 'lucide-react'
import { MutasiFilterClient } from './MutasiFilterClient'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MutasiStokPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const currentDate = new Date()
  const currentMonth = (currentDate.getMonth() + 1).toString()
  const currentYear = currentDate.getFullYear().toString()

  const filterMonth = typeof params.m === 'string' ? params.m : currentMonth
  const filterYear = typeof params.y === 'string' ? params.y : currentYear
  const filterProduct = typeof params.p === 'string' ? params.p : ''

  const startDate = new Date(Number(filterYear), Number(filterMonth) - 1, 1).toISOString()
  const endDate = new Date(Number(filterYear), Number(filterMonth), 0, 23, 59, 59, 999).toISOString()

  const supabase = await createClient()

  // Fetch Products for dropdown
  const { data: products } = await supabase
    .from('products')
    .select('id, kode_produk, merk, type, kode_baterai, kapasitas_ah, kategori')
    .order('merk')

  // Build query
  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      products ( kode_produk, merk, type, kode_baterai, kapasitas_ah, kategori )
    `)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false })

  if (filterProduct) {
    query = query.eq('product_id', filterProduct)
  }

  const { data: movements } = await query

  // Generate Year Options
  const yearOptions = []
  for (let y = currentDate.getFullYear(); y >= 2024; y--) {
    yearOptions.push(y)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header 
        title="Laporan Mutasi Stok" 
        subtitle="Riwayat pergerakan keluar-masuk barang" 
      />
      
      <div className="p-6 space-y-6">
        
        {/* Filter Form */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm w-full md:w-auto">
            <PackageSearch className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700 whitespace-nowrap">Filter Mutasi:</span>
          </div>
          
          <MutasiFilterClient 
            products={products || []}
            initialProduct={filterProduct}
            initialMonth={filterMonth}
            initialYear={filterYear}
            yearOptions={yearOptions}
          />
        </div>

        <MutasiStokTable data={movements || []} />

      </div>
    </div>
  )
}
