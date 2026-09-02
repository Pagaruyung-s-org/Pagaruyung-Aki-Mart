'use client'

import React from 'react'
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils'
import { StatusBadge, PaymentBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { voidPurchase } from '@/actions/void-transactions'
import { useToast } from '@/components/ui/Toast'
import { User, FileText, Calendar, Clock, Truck, ImageIcon } from 'lucide-react'

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
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const [showVoidPrompt, setShowVoidPrompt] = useState(false)
  const [showFoto, setShowFoto] = useState(false)
  const { showToast } = useToast()

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      showToast('error', 'Alasan pembatalan wajib diisi')
      return
    }
    setIsVoiding(true)
    try {
      const res = await voidPurchase(selectedPurchase.id, voidReason)
      if (res.success) {
        showToast('success', res.message)
        setShowVoidPrompt(false)
        setVoidReason('')
        setSelectedPurchase(null)
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
              <tr
                key={p.id}
                className={`border-b hover:bg-gray-50 cursor-pointer ${p.status_transaksi === 'VOID' ? 'bg-red-50/30 opacity-70' : p.status_transaksi === 'REVERSAL' ? 'bg-yellow-50/30' : 'border-gray-50'}`}
                onClick={() => setSelectedPurchase(p)}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">
                  <span className={p.status_transaksi === 'VOID' ? 'text-red-700 line-through' : p.status_transaksi === 'REVERSAL' ? 'text-yellow-700' : 'text-blue-700'}>
                    {p.kode_pembelian}
                  </span>
                  {p.status_transaksi === 'VOID' && <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px]">VOID</span>}
                  {p.status_transaksi === 'REVERSAL' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px]">REVERSAL</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(p.tanggal)}</td>
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
                  <div className="flex flex-col items-center gap-1">
                    <StatusBadge status={p.status_pembayaran} />
                    {p.status_pembayaran === 'LUNAS' && p.keterangan?.includes('Akun:') && (
                      <PaymentBadge method="LUNAS" keterangan={p.keterangan} />
                    )}
                  </div>
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

      {/* Detail Modal */}
      <Modal isOpen={!!selectedPurchase} onClose={() => { setSelectedPurchase(null); setShowVoidPrompt(false); setVoidReason('') }} title="Detail Pembelian" size="xl">
        {selectedPurchase && (
          <div className="space-y-5">

            {/* Info utama */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Pembelian</p>
                <p className="font-mono text-sm font-semibold text-blue-700">{selectedPurchase.kode_pembelian}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanggal Pembelian</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedPurchase.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-900">{(selectedPurchase.suppliers as any)?.nama_supplier || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status Pembayaran</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedPurchase.status_pembayaran} />
                  {selectedPurchase.status_pembayaran === 'LUNAS' && selectedPurchase.keterangan?.includes('Akun:') && (
                    <PaymentBadge method="LUNAS" keterangan={selectedPurchase.keterangan} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status Transaksi</p>
                <StatusBadge status={selectedPurchase.status_transaksi} />
              </div>
            </div>

            {/* Info Faktur — tampil hanya jika ada minimal 1 field */}
            {(selectedPurchase.nama_sales || selectedPurchase.nomor_faktur || selectedPurchase.tanggal_faktur || selectedPurchase.tanggal_jatuh_tempo || selectedPurchase.tanggal_sampai || selectedPurchase.foto_faktur_url) && (
              <div className="border border-blue-100 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Informasi Faktur Supplier</h4>
                </div>
                <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {selectedPurchase.nama_sales && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Nama Sales</p>
                        <p className="text-sm font-medium text-gray-900">{selectedPurchase.nama_sales}</p>
                      </div>
                    </div>
                  )}
                  {selectedPurchase.nomor_faktur && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Nomor Faktur</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{selectedPurchase.nomor_faktur}</p>
                      </div>
                    </div>
                  )}
                  {selectedPurchase.tanggal_faktur && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Tanggal Faktur</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedPurchase.tanggal_faktur)}</p>
                      </div>
                    </div>
                  )}
                  {selectedPurchase.tanggal_jatuh_tempo && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Jatuh Tempo Pembayaran</p>
                        <p className="text-sm font-semibold text-orange-600">{formatDate(selectedPurchase.tanggal_jatuh_tempo)}</p>
                      </div>
                    </div>
                  )}
                  {selectedPurchase.tanggal_sampai && (
                    <div className="flex items-start gap-2">
                      <Truck className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Tanggal Sampai Barang</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedPurchase.tanggal_sampai)}</p>
                      </div>
                    </div>
                  )}

                  {/* Foto Faktur */}
                  {selectedPurchase.foto_faktur_url && (
                    <div className="col-span-2 flex items-start gap-2 pt-1 border-t border-gray-100 mt-1">
                      <ImageIcon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-2">Foto Faktur</p>
                        <button
                          type="button"
                          onClick={() => setShowFoto(true)}
                          className="relative group"
                        >
                          <img
                            src={selectedPurchase.foto_faktur_url}
                            alt="Foto faktur"
                            className="h-28 w-auto rounded-lg border border-gray-200 object-cover group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">Lihat penuh</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-medium text-gray-900 mb-3 border-b pb-2">Item Pembelian</h4>
              {selectedPurchase.purchase_items?.length > 0 ? (
                <div className="space-y-3">
                  {selectedPurchase.purchase_items.map((item: any, index: number) => {
                    const product = item.products
                    const name = product ? `${product.merk} ${product.kategori !== 'Air Aki' ? `${product.kategori}${product.type ? ' ' + product.type : ''}${product.kode_baterai ? ' ' + product.kode_baterai : ''} ${product.kapasitas_ah}AH` : ''}` : 'Produk tidak ditemukan'
                    return (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{name}</p>
                          <p className="text-sm text-gray-500">{item.qty} x {formatRupiah(item.nominal / item.qty)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatRupiah(item.nominal)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Tidak ada item.</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Barang</span>
                <span>{formatRupiah(selectedPurchase.nominal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Pajak</span>
                <span className="text-red-500">{formatRupiah(selectedPurchase.pajak)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Total Bayar</span>
                <span className="text-lg">{formatRupiah(selectedPurchase.total)}</span>
              </div>
            </div>

            {selectedPurchase.keterangan && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                <p><strong>Catatan:</strong> {selectedPurchase.keterangan}</p>
              </div>
            )}

            {selectedPurchase.status_transaksi === 'VOID' && selectedPurchase.void_reason && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 mt-2">
                <strong>Alasan Pembatalan:</strong> {selectedPurchase.void_reason}
              </div>
            )}

            {!showVoidPrompt && selectedPurchase.status_transaksi !== 'VOID' && selectedPurchase.status_transaksi !== 'REVERSAL' && (
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
                    placeholder="Contoh: Salah input barang, retur ke supplier..."
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

      {/* Lightbox foto faktur */}
      {showFoto && selectedPurchase?.foto_faktur_url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFoto(false)}
        >
          <img
            src={selectedPurchase.foto_faktur_url}
            alt="Foto faktur penuh"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setShowFoto(false)}
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
