'use client'

import { PaymentBadge } from '@/components/ui/Badge'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { voidExpense } from '@/actions/void-transactions'
import { useToast } from '@/components/ui/Toast'
import { FileText, Eye, Download } from 'lucide-react'

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
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [showVoidPrompt, setShowVoidPrompt] = useState(false)
  const { showToast } = useToast()

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      showToast('error', 'Alasan pembatalan wajib diisi')
      return
    }
    setIsVoiding(true)
    try {
      const res = await voidExpense(selectedExpense.id, voidReason)
      if (res.success) {
        showToast('success', res.message)
        setShowVoidPrompt(false)
        setVoidReason('')
        setSelectedExpense(null)
      } else {
        showToast('error', res.error)
      }
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setIsVoiding(false)
    }
  }

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
              <tr
                key={e.id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${e.status_transaksi === 'VOID' ? 'bg-red-50/30 opacity-70' : e.status_transaksi === 'REVERSAL' ? 'bg-yellow-50/30' : 'border-gray-50'}`}
                onClick={() => setSelectedExpense(e)}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">
                  <span className={e.status_transaksi === 'VOID' ? 'text-red-700 line-through' : e.status_transaksi === 'REVERSAL' ? 'text-yellow-700' : 'text-gray-600'}>
                    {e.kode_pengeluaran}
                  </span>
                  {e.status_transaksi === 'VOID' && <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px]">VOID</span>}
                  {e.status_transaksi === 'REVERSAL' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px]">REVERSAL</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(e.tanggal)}</td>
                {/* @ts-ignore */}
                <td className="px-4 py-3 text-gray-900">{e.expense_categories?.nama_kategori}</td>
                <td className="px-4 py-3 text-gray-600">{e.keterangan ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(e.nominal)}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-600 font-medium">
                  <PaymentBadge method={e.payment_method} keterangan={e.keterangan} />
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

      <Modal isOpen={!!selectedExpense} onClose={() => setSelectedExpense(null)} title="Detail Pengeluaran" size="md">
        {selectedExpense && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Transaksi</p>
                <p className="font-mono text-sm font-medium text-gray-900">{selectedExpense.kode_pengeluaran}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanggal</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedExpense.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Kategori</p>
                {/* @ts-ignore */}
                <p className="text-sm font-medium text-gray-900">{selectedExpense.expense_categories?.nama_kategori || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Metode Bayar</p>
                <p className="text-sm font-medium text-gray-900">
                  <PaymentBadge method={selectedExpense.payment_method} keterangan={selectedExpense.keterangan} />
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total Nominal</span>
                <span className="text-lg">{formatRupiah(selectedExpense.nominal)}</span>
              </div>
            </div>

            {selectedExpense.keterangan && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Catatan:</strong> {selectedExpense.keterangan}</p>
              </div>
            )}

            {selectedExpense.status_transaksi === 'VOID' && selectedExpense.void_reason && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 mt-2">
                <strong>Alasan Pembatalan:</strong> {selectedExpense.void_reason}
              </div>
            )}

            {!showVoidPrompt && selectedExpense.status_transaksi !== 'VOID' && selectedExpense.status_transaksi !== 'REVERSAL' && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVoidPrompt(true) }}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                >
                  Batalkan Transaksi (Void)
                </button>
              </div>
            )}

            {showVoidPrompt && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Pembatalan (Wajib)</label>
                  <textarea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm text-gray-900 placeholder-gray-400 bg-white"
                    rows={2}
                    placeholder="Contoh: Salah input nominal, double input..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowVoidPrompt(false); setVoidReason('') }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    disabled={isVoiding}
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleVoid}
                    disabled={isVoiding || !voidReason.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isVoiding ? 'Memproses...' : 'Konfirmasi Void'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
