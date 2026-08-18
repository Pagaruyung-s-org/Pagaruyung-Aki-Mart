'use client'

import React from 'react'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'
import { voidSale } from '@/actions/void-transactions'
import { useToast } from '@/components/ui/Toast'

export function RiwayatPenjualanTable({ sales, role }: { sales: any[], role?: string | null }) {
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
  } = usePagination(sales, 10)
  const [selectedSale, setSelectedSale] = useState<any>(null)
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
      const res = await voidSale(selectedSale.id, voidReason)
      if (res.success) {
        showToast('success', res.message)
        setShowVoidPrompt(false)
        setVoidReason('')
        setSelectedSale(null)
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kode Bon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">QTY Item</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Diskon</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              {role !== 'ADMIN' && (
                <th className="text-right px-4 py-3 font-medium text-gray-600">Laba Kotor</th>
              )}
              <th className="text-center px-4 py-3 font-medium text-gray-600">Bayar</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((s) => {
              // @ts-ignore
              const labaKotor = (s.sale_items?.reduce((sum: number, i: any) => sum + i.laba_kotor, 0) ?? 0) + (s.laba_air_aki ?? 0)
              // @ts-ignore
              const qtyItems = (s.sale_items?.reduce((sum: number, i: any) => sum + (i.qty || 0), 0) ?? 0) + (s.include_air_aki ? s.jumlah_air_aki : 0)

              return (
                <tr 
                  key={s.id} 
                  className={`border-b hover:bg-gray-50 cursor-pointer ${s.status_transaksi === 'VOID' ? 'bg-red-50/30 opacity-70' : s.status_transaksi === 'REVERSAL' ? 'bg-yellow-50/30' : 'border-gray-50'}`}
                  onClick={() => setSelectedSale(s)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">
                    <span className={s.status_transaksi === 'VOID' ? 'text-red-700 line-through' : s.status_transaksi === 'REVERSAL' ? 'text-yellow-700' : 'text-green-700'}>
                      {s.kode_penjualan}
                    </span>
                    {s.status_transaksi === 'VOID' && <span className="ml-2 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px]">VOID</span>}
                    {s.status_transaksi === 'REVERSAL' && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px]">REVERSAL</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(s.tanggal)}</td>
                  <td className="px-4 py-3 text-gray-600">{s.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">{qtyItems}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(s.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatRupiah(s.discount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(s.total)}</td>
                  {role !== 'ADMIN' && (
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatRupiah(labaKotor)}</td>
                  )}
                  <td className="px-4 py-3 text-center text-xs text-gray-600">{s.payment_method}</td>
                </tr>
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

      <Modal isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} title="Detail Penjualan" size="lg">
        {selectedSale && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kode Bon</p>
                <p className="font-mono text-sm font-medium text-gray-900">{selectedSale.kode_penjualan}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanggal</p>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedSale.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-medium text-gray-900">{selectedSale.customer_name || 'Umum'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Metode Bayar</p>
                <p className="text-sm font-medium text-gray-900">{selectedSale.payment_method}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3 border-b pb-2">Item Aki</h4>
              {selectedSale.sale_items?.length > 0 ? (
                <div className="space-y-3">
                  {selectedSale.sale_items.map((item: any, index: number) => {
                    const product = item.products
                    const name = product ? `${product.merk} ${product.kategori !== 'Air Aki' ? `${product.kategori}${product.type ? ' ' + product.type : ''}${product.kode_baterai ? ' ' + product.kode_baterai : ''} ${product.kapasitas_ah}AH` : ''}` : 'Produk tidak ditemukan'
                    return (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{name}</p>
                          <p className="text-sm text-gray-500">{item.qty} x {formatRupiah(item.harga_jual)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatRupiah(item.subtotal)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Tidak ada produk aki.</p>
              )}
            </div>

            {selectedSale.include_air_aki && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 border-b pb-2">Air Aki</h4>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Air Aki (Tambahan)</p>
                    <p className="text-sm text-gray-500">{selectedSale.jumlah_air_aki} x {formatRupiah(selectedSale.harga_air_aki)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatRupiah(selectedSale.jumlah_air_aki * selectedSale.harga_air_aki)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatRupiah(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Diskon</span>
                <span className="text-red-500">- {formatRupiah(selectedSale.discount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>Total</span>
                <span className="text-lg">{formatRupiah(selectedSale.total)}</span>
              </div>
            </div>
            
            {(selectedSale.keterangan || selectedSale.kendaraan_nopol) && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                {selectedSale.kendaraan_nopol && (
                  <p><strong>Nopol:</strong> {selectedSale.kendaraan_nopol} {selectedSale.kendaraan_model ? `(${selectedSale.kendaraan_model})` : ''}</p>
                )}
                {selectedSale.keterangan && (
                  <p><strong>Catatan:</strong> {selectedSale.keterangan}</p>
                )}
              </div>
            )}

            {selectedSale.status_transaksi === 'VOID' && selectedSale.void_reason && (
              <div className="bg-red-50 p-3 rounded-lg text-sm text-red-800 mt-2">
                <strong>Alasan Pembatalan:</strong> {selectedSale.void_reason}
              </div>
            )}

            {!showVoidPrompt && selectedSale.status_transaksi !== 'VOID' && selectedSale.status_transaksi !== 'REVERSAL' && (
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
                    placeholder="Contoh: Salah input barang, pelanggan retur..."
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
