export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { MutasiStokTable } from '@/components/tables/reports/MutasiStokTable'
import { Search, PackageSearch } from 'lucide-react'

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
          
          <form className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <select 
              name="p"
              defaultValue={filterProduct}
              className={`border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white max-w-xs text-sm ${!filterProduct ? 'text-gray-500' : 'text-gray-900'}`}
            >
              <option value="" className="text-gray-500">-- Semua Produk --</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.kategori === 'Air Aki' 
                    ? p.merk 
                    : [p.merk, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')} ({p.kode_produk})
                </option>
              ))}
            </select>

            <select 
              name="m" 
              defaultValue={filterMonth}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-500"
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
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-500"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Search className="h-4 w-4" /> Cari
            </button>
          </form>
        </div>

        <MutasiStokTable data={movements || []} />

      </div>
    </div>
  )
}
