'use client'

import React, { useState } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { ChevronDown, ChevronRight, Banknote } from 'lucide-react'
import { FormPembayaranPiutang } from '@/components/forms/FormPembayaranPiutang'

interface Account {
  id: string
  name: string
  type: string
}

interface CustomerPayment {
  id: string
  kode_pembayaran: string
  tanggal: string
  nominal: number
  payment_method: string
}

interface Receivable {
  id: string
  kode_piutang: string
  sale_id: string
  tanggal: string
  customer_name: string
  total: number
  total_dibayar: number
  sisa_piutang: number
  status_pembayaran: 'BELUM_LUNAS' | 'LUNAS' | 'PARSIAL'
  sales?: { kode_penjualan: string }
  customer_payments?: CustomerPayment[]
}

interface Props {
  receivables: Receivable[]
  accounts: Account[]
}

function statusVariant(s: string) {
  if (s === 'LUNAS') return 'success' as const
  if (s === 'PARSIAL') return 'warning' as const
  return 'danger' as const
}

export function PiutangTable({ receivables, accounts }: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [bayarId, setBayarId] = useState<string | null>(null)

  const toggle = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, currentData, totalItems, goToNextPage, goToPrevPage } =
    usePagination(receivables, 10)

  const selectedReceivable = bayarId ? receivables.find(r => r.id === bayarId) : null

  return (
    <>
      {/* Modal bayar */}
      {selectedReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Bayar Piutang</h3>
            <FormPembayaranPiutang
              receivableId={selectedReceivable.id}
              kodePiutang={selectedReceivable.kode_piutang}
              customerName={selectedReceivable.customer_name}
              sisaPiutang={selectedReceivable.sisa_piutang}
              accounts={accounts}
              onSuccess={() => setBayarId(null)}
              onCancel={() => setBayarId(null)}
            />
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium text-gray-600">Kode Piutang</th>
                <th className="px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Sudah Dibayar</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Sisa</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((r) => {
                const isExpanded = expandedRows[r.id]
                return (
                  <React.Fragment key={r.id}>
                    <tr className={`border-b border-gray-50 hover:bg-orange-50/30 transition-colors ${isExpanded ? 'bg-orange-50/10' : ''}`}>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(r.id)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-orange-500" />
                            : <ChevronRight className="h-4 w-4 text-gray-400" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.kode_piutang}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(r.tanggal)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.customer_name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(r.total)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{formatRupiah(r.total_dibayar)}</td>
                      <td className="px-4 py-3 text-right font-bold text-orange-600">{formatRupiah(r.sisa_piutang)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant(r.status_pembayaran)}>{r.status_pembayaran.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.status_pembayaran !== 'LUNAS' && (
                          <button
                            type="button"
                            onClick={() => setBayarId(r.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Bayar
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Riwayat pembayaran */}
                    <tr>
                      <td colSpan={9} className="p-0 border-none">
                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-b border-orange-100/50' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <div className="p-4 pl-14 bg-gradient-to-r from-orange-50/20 to-transparent">
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                Ref. Penjualan: <span className="text-gray-800">{r.sales?.kode_penjualan ?? '-'}</span>
                              </p>
                              {r.customer_payments && r.customer_payments.length > 0 ? (
                                <div className="border border-orange-100/50 rounded-lg overflow-hidden bg-white shadow-sm">
                                  <table className="w-full text-xs text-left text-gray-500">
                                    <thead className="bg-gray-50/80 border-b border-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 font-medium text-gray-600">Kode Bayar</th>
                                        <th className="px-4 py-2 font-medium text-gray-600">Tanggal</th>
                                        <th className="px-4 py-2 font-medium text-gray-600">Metode</th>
                                        <th className="px-4 py-2 font-medium text-gray-600 text-right">Nominal</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.customer_payments.map(p => (
                                        <tr key={p.id} className="border-b border-gray-50 last:border-0">
                                          <td className="px-4 py-2 font-medium text-gray-800">{p.kode_pembayaran}</td>
                                          <td className="px-4 py-2">{formatDate(p.tanggal)}</td>
                                          <td className="px-4 py-2">{p.payment_method}</td>
                                          <td className="px-4 py-2 text-right text-green-700 font-semibold">{formatRupiah(p.nominal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic">Belum ada pembayaran</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}
              {currentData.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    Tidak ada piutang aktif 🎉
                  </td>
                </tr>
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
    </>
  )
}
