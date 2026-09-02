'use client'

import React, { useState } from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { voidSupplierPayment } from '@/actions/void-transactions'

export function RiwayatPembayaranHutangTable({ payments, role }: { payments: any[], role: string | null }) {
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
  } = usePagination(payments, 10)

  const [selectedPayment, setSelectedPayment] = useState<any>(null)
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
      const res = await voidSupplierPayment(selectedPayment.id, voidReason)
      if (res.success) {
        showToast('success', res.message || 'Berhasil dibatalkan')
        setShowVoidPrompt(false)
        setVoidReason('')
        setSelectedPayment(null)
      } else {
        showToast('error', res.error || 'Gagal dibatalkan')
      }
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran Hutang</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode Pembayaran</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Nominal</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Metode</th>
            </tr>
          </thead>
          <tbody>
            {!currentData || currentData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">Belum ada riwayat pembayaran</td>
              </tr>
            ) : (
              currentData.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${p.status_transaksi === 'VOID' ? 'bg-red-50/30 opacity-70' : p.status_transaksi === 'REVERSAL' ? 'bg-yellow-50/30' : 'border-gray-50'}`}
                  onClick={() => setSelectedPayment(p)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    <span className={p.status_transaksi === 'VOID' ? 'text-red-700 line-through' : p.status_transaksi === 'REVERSAL' ? 'text-yellow-700' : 'text-blue-700'}>
                      {p.kode_pembayaran}
                    </span>
                    {p.status_transaksi === 'VOID' && <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px]">VOID</span>}
                    {p.status_transaksi === 'REVERSAL' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px]">REVERSAL</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(p.tanggal)}</td>
                  <td className="px-4 py-3 text-gray-600">{p.suppliers?.nama_supplier ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(p.nominal)}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{p.payment_method || p.metode_pembayaran || '-'}</td>
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

      <Modal
        isOpen={!!selectedPayment}
        onClose={() => {
          if (!isVoiding) {
            setSelectedPayment(null)
            setShowVoidPrompt(false)
            setVoidReason('')
          }
        }}
        title="Detail Pembayaran Hutang"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Pembayaran</p>
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {selectedPayment.kode_pembayaran}
                  {selectedPayment.status_transaksi === 'VOID' && <span className="ml-2 text-red-600 text-xs bg-red-100 px-2 py-0.5 rounded">VOID</span>}
                  {selectedPayment.status_transaksi === 'REVERSAL' && <span className="ml-2 text-yellow-600 text-xs bg-yellow-100 px-2 py-0.5 rounded">REVERSAL</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanggal</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedPayment.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-900">{selectedPayment.suppliers?.nama_supplier || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Pembelian (Nota)</p>
                <p className="text-sm font-medium text-blue-600 font-mono">{selectedPayment.purchase_transactions?.kode_pembelian || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Nominal</p>
                <p className="text-lg font-semibold text-gray-900">{formatRupiah(selectedPayment.nominal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Metode Pembayaran</p>
                <p className="text-sm font-medium text-gray-900">{selectedPayment.payment_method || selectedPayment.metode_pembayaran || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Keterangan</p>
                <p className="text-sm text-gray-700 bg-white p-2 border border-gray-100 rounded-md">
                  {selectedPayment.keterangan || 'Tidak ada keterangan'}
                </p>
              </div>
            </div>

            {selectedPayment.status_transaksi === 'VOID' && selectedPayment.void_reason && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 mt-2 border border-red-100">
                <strong>Alasan Pembatalan:</strong> {selectedPayment.void_reason}
              </div>
            )}

            {!showVoidPrompt && selectedPayment.status_transaksi !== 'VOID' && selectedPayment.status_transaksi !== 'REVERSAL' && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowVoidPrompt(true) }}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors shadow-sm cursor-pointer"
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
                    placeholder="Contoh: Salah input nominal, dibatalkan supplier..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowVoidPrompt(false); setVoidReason('') }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isVoiding}
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleVoid}
                    disabled={isVoiding || !voidReason.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
