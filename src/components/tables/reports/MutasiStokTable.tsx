'use client'

import React from 'react'
import { formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function MutasiStokTable({ data }: { data: any[] }) {
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
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Histori Mutasi Stok</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL</th>
              <th className="px-6 py-4 font-semibold">PRODUK</th>
              <th className="px-6 py-4 font-semibold text-center">TIPE</th>
              <th className="px-6 py-4 font-semibold">KETERANGAN & REF</th>
              <th className="px-6 py-4 font-semibold text-center">MASUK</th>
              <th className="px-6 py-4 font-semibold text-center">KELUAR</th>
              <th className="px-6 py-4 font-semibold text-center bg-gray-50/50">SALDO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada pergerakan stok.
                </td>
              </tr>
            ) : (
              currentData.map(row => {
                const isMasuk = row.qty_in > 0
                
                return (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{formatDateTime(row.transaction_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {row.products?.kategori === 'Air Aki' 
                          ? row.products?.merk 
                          : [row.products?.merk, row.products?.type, row.products?.kode_baterai, `${row.products?.kapasitas_ah}AH`].filter(Boolean).join(' ')}
                      </div>
                      <div className="text-xs text-gray-500">{row.products?.kode_produk}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${isMasuk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {row.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{row.keterangan || '-'}</div>
                      {row.reference_type && (
                        <div className="text-xs text-gray-500">Ref: {row.reference_type}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">
                      {row.qty_in > 0 ? `+${row.qty_in}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-red-600">
                      {row.qty_out > 0 ? `-${row.qty_out}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-900 bg-gray-50/50">
                      {row.balance !== null ? row.balance : '-'}
                    </td>
                  </tr>
                )
              })
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
