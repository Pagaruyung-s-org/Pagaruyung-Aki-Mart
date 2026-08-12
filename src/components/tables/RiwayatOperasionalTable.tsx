'use client'

import React from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function RiwayatOperasionalTable({ expenses }: { expenses: any[] }) {
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
  } = usePagination(expenses, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Riwayat Pengeluaran</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Keterangan</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((e) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.kode_pengeluaran}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(e.tanggal)}</td>
                {/* @ts-ignore */}
                <td className="px-4 py-3 text-gray-900">{e.expense_categories?.nama_kategori}</td>
                <td className="px-4 py-3 text-gray-600">{e.keterangan ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(e.nominal)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-600">{e.payment_method}</td>
              </tr>
            ))}
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
