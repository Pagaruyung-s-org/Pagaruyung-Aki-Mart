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
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)

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

      <div className="w-[140px]">
        <Select 
          name="m" 
          value={month}
          onChange={(e) => setMonth(e.target.value)}
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
      </div>
      
      <div className="w-[110px]">
        <Select 
          name="y" 
          value={year}
          onChange={(e) => setYear(e.target.value)}
          options={yearOptions.map(y => ({ value: String(y), label: String(y) }))}
        />
      </div>

      <button 
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-[38px] rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Search className="h-4 w-4" /> Cari
      </button>
    </form>
  )
}
