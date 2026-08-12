'use client'

import React from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function HutangAktifTable({ hutangList }: { hutangList: any[] }) {
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
  } = usePagination(hutangList, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Sudah Bayar</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo Hutang</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{p.kode_pembelian}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(p.tanggal)}</td>
                {/* @ts-ignore */}
                <td className="px-4 py-3 text-gray-900">{(p.suppliers as any)?.nama_supplier}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.total)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatRupiah(p.totalPaid)}</td>
                <td className="px-4 py-3 text-right font-bold text-orange-600">{formatRupiah(p.saldoHutang)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={p.status_pembayaran === 'PARSIAL' ? 'warning' : 'danger'}>
                    {p.status_pembayaran}
                  </Badge>
                </td>
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
