'use client'

import React from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export function RiwayatPembelianTable({ purchases }: { purchases: any[] }) {
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
  } = usePagination(purchases, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">QTY</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{p.kode_pembelian}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(p.tanggal)}</td>
                <td className="px-4 py-3 text-gray-900">
                  {/* @ts-ignore */}
                  {(p.suppliers as any)?.nama_supplier ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate" title={
                  // @ts-ignore
                  p.purchase_items?.map((i: any) => i.products ? `${i.products.merk} ${i.products.kategori !== 'Air Aki' ? `${i.products.kategori}${i.products.type ? ' ' + i.products.type : ''}${i.products.kode_baterai ? ' ' + i.products.kode_baterai : ''} ${i.products.kapasitas_ah}AH` : ''}` : '').join(', ')
                }>
                  {/* @ts-ignore */}
                  {p.purchase_items?.map((i: any) => i.products ? `${i.products.merk} ${i.products.kategori !== 'Air Aki' ? `${i.products.kategori}${i.products.type ? ' ' + i.products.type : ''}${i.products.kode_baterai ? ' ' + i.products.kode_baterai : ''} ${i.products.kapasitas_ah}AH` : ''}` : '').join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-center text-gray-900 font-medium">
                  {/* @ts-ignore */}
                  {p.purchase_items?.reduce((sum: number, item: any) => sum + (item.qty || 0), 0) || 0}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.nominal)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(p.total)}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={p.status_pembayaran} />
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
