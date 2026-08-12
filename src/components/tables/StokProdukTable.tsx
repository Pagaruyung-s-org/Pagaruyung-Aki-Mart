'use client'

import { formatRupiah, getStokStatus } from '@/lib/utils'
import { Boxes } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

interface Batch {
  id: string
  qty_tersedia: number
  harga_modal_unit: number
  tanggal_masuk: string
}

interface Product {
  id: string
  kode_produk: string
  merk: string
  kategori: string
  kode_baterai: string | null
  kapasitas_ah: number
  harga_jual: number
  qty_stok: number
}

interface StokProdukTableProps {
  products: Product[]
  batchByProduct: Record<string, Batch[]>
  isAirAki?: boolean
}

export function StokProdukTable({ products, batchByProduct, isAirAki }: StokProdukTableProps) {
  if (!products || products.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Boxes className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Belum ada produk</p>
        </div>
      </div>
    )
  }

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalItems,
    goToNextPage,
    goToPrevPage
  } = usePagination(products, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{isAirAki ? 'Nama / Varian' : 'Merk'}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
              {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kode Baterai</th>}
              {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kapasitas (AH)</th>}
              <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Jual</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Stok</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Modal</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((p) => {
              const stok = getStokStatus(p.qty_stok)
              const productBatches = batchByProduct[p.id] ?? []

              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.kode_produk}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.merk}</td>
                  <td className="px-4 py-3 text-gray-600">{p.kategori}</td>
                  {!isAirAki && <td className="px-4 py-3 text-center text-gray-600">{p.kode_baterai ?? '—'}</td>}
                  {!isAirAki && <td className="px-4 py-3 text-center text-gray-700">{p.kapasitas_ah}</td>}
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.harga_jual)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${stok.color}`}>{p.qty_stok}</span>
                    <span className={`text-xs ml-1 ${stok.color}`}>({stok.label})</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {productBatches.length === 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <div className="flex flex-col gap-1 text-right">
                        {productBatches.map((b: any) => (
                          <div key={b.id} className="flex justify-end gap-2 items-center text-xs">
                            <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{b.qty_tersedia} pcs</span>
                            <span className="font-medium text-gray-900 w-20">{formatRupiah(b.harga_modal_unit)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
        goToNextPage={goToNextPage}
        goToPrevPage={goToPrevPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}
