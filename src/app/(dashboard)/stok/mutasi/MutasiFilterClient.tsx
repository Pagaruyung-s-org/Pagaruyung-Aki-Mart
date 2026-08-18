'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Select } from '@/components/ui/Select'

export function MutasiFilterClient({ 
  products, 
  initialProduct, 
  initialMonth, 
  initialYear,
  yearOptions
}: {
  products: any[]
  initialProduct: string
  initialMonth: string
  initialYear: string
  yearOptions: number[]
}) {
  const [product, setProduct] = useState(initialProduct)

  return (
    <form className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
      <div className="w-full sm:w-[320px]">
        <Select 
          name="p"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="-- Semua Produk --"
          options={[
            { value: '', label: '-- Semua Produk --' },
            ...products.map(p => ({
              value: p.id,
              label: p.kategori === 'Air Aki' 
                ? p.merk 
                : [p.merk, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
            }))
          ]}
        />
      </div>

      <select 
        name="m" 
        defaultValue={initialMonth}
        className="border border-gray-300 rounded-lg h-[38px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-700"
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
        defaultValue={initialYear}
        className="border border-gray-300 rounded-lg h-[38px] px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm text-gray-700"
      >
        {yearOptions.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button 
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-[38px] rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Search className="h-4 w-4" /> Cari
      </button>
    </form>
  )
}
