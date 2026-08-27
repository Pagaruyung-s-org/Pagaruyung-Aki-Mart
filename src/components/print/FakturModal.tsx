'use client'

import { useRef, useEffect } from 'react'
import { X, Printer } from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/lib/utils'

interface FakturSaleItem {
  qty: number
  harga_jual: number
  subtotal: number
  products: {
    merk: string
    kategori: string
    type: string | null
    kode_baterai: string | null
    kapasitas_ah: number
    kode_produk: string
  } | null
}

interface FakturSaleData {
  id: string
  kode_penjualan: string
  tanggal: string
  created_at?: string
  customer_name: string | null
  subtotal: number
  discount: number
  total: number
  payment_method: string
  keterangan: string | null
  include_air_aki?: boolean
  jumlah_air_aki?: number
  harga_air_aki?: number
  harga_jual_air_aki?: number
  sale_items: FakturSaleItem[]
}

interface FakturModalProps {
  isOpen: boolean
  onClose: () => void
  sale: FakturSaleData | null
  autoPrint?: boolean
}

export function FakturModal({ isOpen, onClose, sale, autoPrint = false }: FakturModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && sale && autoPrint) {
      // Small delay to ensure DOM is fully rendered before printing
      const timer = setTimeout(() => {
        window.print()
      }, 100)
      
      const handleAfterPrint = () => {
        onClose()
      }
      
      window.addEventListener('afterprint', handleAfterPrint)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('afterprint', handleAfterPrint)
      }
    }
  }, [isOpen, sale, autoPrint, onClose])

  if (!isOpen || !sale) return null

  const handlePrint = () => {
    window.print()
  }

  const formatTanggal = () => {
    return formatDateTime(sale.created_at || sale.tanggal)
  }

  const containerClass = autoPrint
    ? "fixed left-[-9999px] top-0"
    : "fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:items-start"

  return (
    <div
      ref={overlayRef}
      className={containerClass}
      onClick={(e) => {
        if (!autoPrint && e.target === overlayRef.current) onClose()
      }}
    >
      {/* Backdrop - hidden on print, and completely hidden on autoPrint */}
      {!autoPrint && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm print:hidden" />}

      {/* Modal Container */}
      <div className={`relative w-full max-w-2xl bg-white rounded-2xl print:rounded-none print:shadow-none print:max-w-none print:w-full ${!autoPrint ? 'shadow-2xl' : ''}`}>
        
        {/* Modal Header - hidden on print and autoPrint */}
        {!autoPrint && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
            <h2 className="text-base font-semibold text-gray-900">Preview Faktur</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak Sekarang
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Faktur Content - this is what gets printed */}
        <div ref={printRef} id="faktur-print-area" className={`px-6 py-5 overflow-y-auto print:max-h-none print:overflow-visible print:px-0 print:py-0 ${!autoPrint ? 'max-h-[80vh]' : ''}`}>
          <div className="font-mono text-sm print:text-[10pt] text-black">
            
            {/* Header Toko */}
            <div className="text-center mb-4 pb-3 border-b-2 border-black border-dashed print:border-dashed">
              <h1 className="text-lg font-bold tracking-wide print:text-[14pt]">PAGARUYUNG AKI MART</h1>
              <p className="text-xs text-black mt-1">Jalan Raya Pagaruyung</p>
              <p className="text-xs text-black">Telp: 0812-XXXX-XXXX</p>
            </div>

            {/* Info Transaksi */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4 print:text-[9pt]">
              <div>
                <span className="text-black">No. Bon:</span>
                <span className="ml-2 font-semibold">{sale.kode_penjualan}</span>
              </div>
              <div className="text-right">
                <span className="text-black">Tanggal:</span>
                <span className="ml-2">{formatTanggal()}</span>
              </div>
              <div>
                <span className="text-black">Customer:</span>
                <span className="ml-2">{sale.customer_name || 'Umum'}</span>
              </div>
              <div className="text-right">
                <span className="text-black">Bayar:</span>
                <span className="ml-2">{sale.payment_method}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-black border-dashed mb-3 print:border-dashed" />

            {/* Tabel Item */}
            <table className="w-full text-xs print:text-[9pt]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 font-semibold">Produk</th>
                  <th className="text-center py-1 font-semibold w-12">Qty</th>
                  <th className="text-right py-1 font-semibold">Harga</th>
                  <th className="text-right py-1 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {sale.sale_items?.map((item, idx) => {
                  const product = item.products
                  const name = product
                    ? product.kategori === 'Air Aki'
                      ? product.merk
                      : [product.merk, product.kategori, product.type, product.kode_baterai, `${product.kapasitas_ah}AH`].filter(Boolean).join(' ')
                    : 'Produk'
                  return (
                    <tr key={idx} className="border-b border-gray-300 print:border-black">
                      <td className="py-1.5 pr-2 max-w-[200px] truncate">{name}</td>
                      <td className="py-1.5 text-center">{item.qty}</td>
                      <td className="py-1.5 text-right">{formatRupiah(item.harga_jual)}</td>
                      <td className="py-1.5 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  )
                })}
                {sale.include_air_aki && (sale.jumlah_air_aki ?? 0) > 0 && (
                  <tr className="border-b border-gray-300 print:border-black">
                    <td className="py-1.5 pr-2">Air Aki (Tambahan)</td>
                    <td className="py-1.5 text-center">{sale.jumlah_air_aki}</td>
                    <td className="py-1.5 text-right">{formatRupiah(sale.harga_jual_air_aki ?? sale.harga_air_aki ?? 0)}</td>
                    <td className="py-1.5 text-right font-medium">{formatRupiah((sale.jumlah_air_aki ?? 0) * (sale.harga_jual_air_aki ?? sale.harga_air_aki ?? 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Separator */}
            <div className="border-t border-black border-dashed my-3 print:border-dashed" />

            {/* Totals */}
            <div className="space-y-1 text-xs print:text-[9pt]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span>- {formatRupiah(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-black print:text-[11pt]">
                <span>TOTAL</span>
                <span>{formatRupiah(sale.total)}</span>
              </div>
            </div>

            {/* Keterangan */}
            {sale.keterangan && (
              <div className="mt-3 text-xs text-black">
                <span className="font-semibold">Catatan:</span> {sale.keterangan}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-dashed border-gray-400 text-center text-xs text-black">
              <p>Terima kasih atas pembelian Anda!</p>
              <p className="mt-1">Barang yang sudah dibeli tidak dapat dikembalikan.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
