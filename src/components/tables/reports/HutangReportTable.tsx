'use client'

import { PaymentBadge } from '@/components/ui/Badge'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function HutangReportTable({ data }: { data: any[] }) {
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
        <h3 className="font-semibold text-gray-900">Riwayat Pembayaran Hutang</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL & KODE</th>
              <th className="px-6 py-4 font-semibold">SUPPLIER</th>
              <th className="px-6 py-4 font-semibold">NOTA PEMBELIAN</th>
              <th className="px-6 py-4 font-semibold text-center">METODE</th>
              <th className="px-6 py-4 font-semibold text-right">NOMINAL BAYAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada histori pembayaran hutang di periode ini.
                </td>
              </tr>
            ) : (
              currentData.map(row => (
                <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${row.status_transaksi === 'VOID' ? 'bg-red-50/30 opacity-75' : row.status_transaksi === 'REVERSAL' ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatDateTime(row.tanggal)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${row.status_transaksi === 'VOID' ? 'text-red-500 line-through' : row.status_transaksi === 'REVERSAL' ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {row.kode_pembayaran}
                      </span>
                      {row.status_transaksi === 'VOID' && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-medium">VOID</span>}
                      {row.status_transaksi === 'REVERSAL' && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-medium">REVERSAL</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {row.supplier_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {row.kode_pembelian}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {row.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
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
