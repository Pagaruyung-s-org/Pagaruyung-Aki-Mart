'use client'

import React, { useMemo } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

function getBillingMonth(dateStr: string) {
  const d = new Date(dateStr)
  let m = d.getMonth()
  let y = d.getFullYear()
  if (d.getDate() >= 25) {
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return new Date(y, m, 1)
}

export function HutangAktifTable({ hutangList }: { hutangList: any[] }) {
  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {}

    hutangList.forEach(item => {
      const bMonth = getBillingMonth(item.tanggal)
      const bMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(bMonth)
      // @ts-ignore
      const supplierName = item.suppliers?.nama_supplier || 'Unknown'
      const groupId = `${item.supplier_id}_${bMonth.getTime()}`

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          supplier_name: supplierName,
          billingMonth: bMonth,
          billingMonthName: bMonthName,
          jumlah_faktur: 0,
          total: 0,
          totalPaid: 0,
          saldoHutang: 0,
        }
      }
      groups[groupId].jumlah_faktur += 1
      groups[groupId].total += item.total
      groups[groupId].totalPaid += item.totalPaid
      groups[groupId].saldoHutang += item.saldoHutang
    })

    // Sort by billing month (desc) then supplier name
    return Object.values(groups).sort((a, b) => {
      if (b.billingMonth.getTime() !== a.billingMonth.getTime()) {
        return b.billingMonth.getTime() - a.billingMonth.getTime()
      }
      return a.supplier_name.localeCompare(b.supplier_name)
    })
  }, [hutangList])

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
  } = usePagination(groupedData, 10)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Bulan Tagihan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Jml Faktur</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Sudah Bayar</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo Hutang</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((g) => (
              <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{g.billingMonthName}</td>
                <td className="px-4 py-3 text-gray-700">{g.supplier_name}</td>
                <td className="px-4 py-3 text-center text-gray-600">{g.jumlah_faktur}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(g.total)}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatRupiah(g.totalPaid)}</td>
                <td className="px-4 py-3 text-right font-bold text-orange-600">{formatRupiah(g.saldoHutang)}</td>
                <td className="px-4 py-3 text-center">
                  {g.totalPaid > 0 ? (
                    <Badge variant="warning">PARSIAL</Badge>
                  ) : (
                    <Badge variant="danger">HUTANG</Badge>
                  )}
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
