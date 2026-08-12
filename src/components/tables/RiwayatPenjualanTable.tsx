'use client'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function RiwayatPenjualanTable({ sales }: { sales: any[] }) {
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
  } = usePagination(sales, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode Bon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">QTY Item</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Diskon</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Laba Kotor</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((s) => {
              // @ts-ignore
              const labaKotor = (s.sale_items?.reduce((sum: number, i: any) => sum + i.laba_kotor, 0) ?? 0) + (s.laba_air_aki ?? 0)
              // @ts-ignore
              const qtyItems = (s.sale_items?.reduce((sum: number, i: any) => sum + (i.qty || 0), 0) ?? 0) + (s.include_air_aki ? s.jumlah_air_aki : 0)

              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-green-700">{s.kode_penjualan}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(s.tanggal)}</td>
                  <td className="px-4 py-3 text-gray-600">{s.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">{qtyItems}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(s.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatRupiah(s.discount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(s.total)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatRupiah(labaKotor)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{s.payment_method}</td>
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
