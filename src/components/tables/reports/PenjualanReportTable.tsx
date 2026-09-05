'use client'

import { PaymentBadge } from '@/components/ui/Badge'

import React from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'


export function PenjualanReportTable({ data }: { data: any[] }) {
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
  } = usePagination(data, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Rincian Penjualan</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL & KODE</th>
              <th className="px-6 py-4 font-semibold">PELANGGAN</th>
              <th className="px-6 py-4 font-semibold text-center">METODE</th>
              <th className="px-6 py-4 font-semibold text-center">ITEM (QTY)</th>
              <th className="px-6 py-4 font-semibold text-right">TOTAL NILAI</th>
              <th className="px-6 py-4 font-semibold text-right">LABA KOTOR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada transaksi penjualan di periode ini.
                </td>
              </tr>
            ) : (
              currentData.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatDate(row.tanggal)}</div>
                    <div className="text-xs text-gray-500">{row.kode_penjualan}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.customer_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <PaymentBadge method={row.payment_method} keterangan={row.keterangan} />
                  </td>
                  <td className="px-6 py-4 text-center font-medium">
                    {row.total_qty}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatRupiah(row.total)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-purple-600">
                    {formatRupiah(row.total_laba)}
                  </td>
                </tr>
              ))
            )}
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
