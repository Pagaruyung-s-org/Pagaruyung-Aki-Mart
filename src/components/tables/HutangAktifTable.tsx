'use client'

import React, { useMemo, useState } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'

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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {}

    hutangList.forEach(item => {
      const bMonth = getBillingMonth(item.tanggal)
      const bMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(bMonth)
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
          items: []
        }
      }
      groups[groupId].jumlah_faktur += 1
      groups[groupId].total += item.total
      groups[groupId].totalPaid += item.totalPaid
      groups[groupId].saldoHutang += item.saldoHutang
      groups[groupId].items.push(item)
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
              <th className="w-10 px-4 py-3"></th>
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
            {currentData.map((g) => {
              const isExpanded = expandedRows[g.id]
              return (
                <React.Fragment key={g.id}>
                  {/* Summary Row */}
                  <tr 
                    onClick={() => toggleRow(g.id)}
                    className={`border-b border-gray-50 hover:bg-orange-50/30 cursor-pointer transition-colors ${isExpanded ? 'bg-orange-50/10' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      <div className="p-1 rounded hover:bg-gray-100 transition-colors inline-block">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-orange-500" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{g.billingMonthName}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{g.supplier_name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">{g.jumlah_faktur}</span>
                    </td>
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

                  {/* Expanded Subtable Row */}
                  <tr>
                    <td colSpan={8} className="p-0 border-none">
                      <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-b border-orange-100/50' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                          <div className="p-4 pl-14 bg-gradient-to-r from-orange-50/20 to-transparent">
                            
                            <div className="border border-orange-100/50 rounded-lg overflow-hidden bg-white shadow-sm">
                              <table className="w-full text-xs text-left text-gray-500">
                                <thead className="bg-gray-50/80 border-b border-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 font-medium text-gray-600">No. Faktur</th>
                                    <th className="px-4 py-2 font-medium text-gray-600">Tanggal</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Total Tagihan</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Telah Dibayar</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-right">Sisa Hutang</th>
                                    <th className="px-4 py-2 font-medium text-gray-600 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.items.map((item: any) => (
                                    <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                      <td className="px-4 py-2 text-gray-800 font-medium flex items-center gap-2">
                                        <FileText className="h-3 w-3 text-gray-400" />
                                        {item.kode_pembelian}
                                      </td>
                                      <td className="px-4 py-2">{formatDate(item.tanggal)}</td>
                                      <td className="px-4 py-2 text-right">{formatRupiah(item.total)}</td>
                                      <td className="px-4 py-2 text-right text-green-600">{formatRupiah(item.totalPaid)}</td>
                                      <td className="px-4 py-2 text-right font-semibold text-orange-600">{formatRupiah(item.saldoHutang)}</td>
                                      <td className="px-4 py-2 text-center">
                                        {item.totalPaid > 0 ? (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-800 font-medium">PARSIAL</span>
                                        ) : (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-800 font-medium">HUTANG</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
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
