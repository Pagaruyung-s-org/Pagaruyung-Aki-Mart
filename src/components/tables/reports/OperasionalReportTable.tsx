'use client'

import { PaymentBadge } from '@/components/ui/Badge'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function OperasionalReportTable({ data }: { data: any[] }) {
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
        <h3 className="font-semibold text-gray-900">Rincian Operasional</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL & KODE</th>
              <th className="px-6 py-4 font-semibold">KATEGORI</th>
              <th className="px-6 py-4 font-semibold">KARYAWAN</th>
              <th className="px-6 py-4 font-semibold text-center">METODE</th>
              <th className="px-6 py-4 font-semibold">KETERANGAN</th>
              <th className="px-6 py-4 font-semibold text-right">NOMINAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada pengeluaran operasional di periode ini.
                </td>
              </tr>
            ) : (
              currentData.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatDateTime(row.tanggal)}</div>
                    <div className="text-xs text-gray-500">{row.kode_pengeluaran}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.kategori_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {row.karyawan_name}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {row.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {row.keterangan || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">
                    {formatRupiah(row.nominal)}
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
