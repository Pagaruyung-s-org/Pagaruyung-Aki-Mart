'use client'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function ArusKasReportTable({ data }: { data: any[] }) {
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
        <h3 className="font-semibold text-gray-900">Rincian Transaksi Arus Kas</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL</th>
              <th className="px-6 py-4 font-semibold">AKUN</th>
              <th className="px-6 py-4 font-semibold text-center">TIPE TRANSAKSI</th>
              <th className="px-6 py-4 font-semibold">DESKRIPSI & REFERENSI</th>
              <th className="px-6 py-4 font-semibold text-right">MASUK (DEBIT)</th>
              <th className="px-6 py-4 font-semibold text-right">KELUAR (KREDIT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada pergerakan arus kas di periode ini.
                </td>
              </tr>
            ) : (
              currentData.map(row => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatDateTime(row.tanggal)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border uppercase ${row.account_type === 'KAS' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {row.accounts?.name || row.account_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${row.transaction_type === 'DEBIT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {row.transaction_type === 'DEBIT' ? 'MASUK' : 'KELUAR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{row.description || '-'}</div>
                    <div className="text-xs text-gray-500">Ref: {row.reference_type || 'Manual'}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">
                    {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">
                    {row.credit > 0 ? formatRupiah(row.credit) : '-'}
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
