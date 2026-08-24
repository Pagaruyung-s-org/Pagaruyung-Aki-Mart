'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { saveOpeningBalance } from '@/actions/opening-balance'
import { useToast } from '@/components/ui/Toast'
import { formatRupiah } from '@/lib/utils'

interface OpeningBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  product: any
  existingBalance?: any
}

export function OpeningBalanceModal({ isOpen, onClose, product, existingBalance }: OpeningBalanceModalProps) {
  const [qty, setQty] = useState('')
  const [hargaModal, setHargaModal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      if (existingBalance) {
        setQty(existingBalance.qty.toString())
        setHargaModal(new Intl.NumberFormat('id-ID').format(existingBalance.harga_modal))
        setKeterangan(existingBalance.keterangan || '')
      } else {
        setQty('')
        setHargaModal('')
        setKeterangan('')
      }
    }
  }, [isOpen, existingBalance])

  if (!product) return null

  const getProductName = (p: any) => {
    if (p.kategori === 'Air Aki') return p.merk
    return [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
  }

  const handleSubmit = async () => {
    const hargaModalNum = hargaModal ? Number(hargaModal.replace(/\D/g, '')) : 0
    if (!qty || Number(qty) < 0) {
      showToast('error', 'Qty harus diisi dan tidak boleh negatif')
      return
    }
    if (!hargaModalNum || hargaModalNum <= 0) {
      showToast('error', 'Harga modal harus diisi lebih dari 0')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await saveOpeningBalance({
        product_id: product.id,
        qty: Number(qty),
        harga_modal: hargaModalNum,
        keterangan
      })

      if (result.success) {
        showToast('success', result.message)
        onClose()
      } else {
        showToast('error', result.error)
      }
    } catch (e: any) {
      showToast('error', 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingBalance ? "Edit Saldo Awal" : "Input Saldo Awal"} size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
          <p className="text-sm font-medium text-blue-900">{getProductName(product)}</p>
          <p className="text-xs text-blue-700 font-mono mt-1">{product.kode_produk}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Qty Saldo Awal <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white placeholder-gray-400"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Harga Modal / HPP per Unit <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={hargaModal}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setHargaModal(val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '')
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white placeholder-gray-400"
              placeholder="0"
            />
          </div>
          {hargaModal && Number(hargaModal.replace(/\D/g, '')) > 0 && qty && Number(qty) > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Total Nilai Aset: {formatRupiah(Number(hargaModal.replace(/\D/g, '')) * Number(qty))}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Keterangan (Opsional)</label>
          <input
            type="text"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white placeholder-gray-400"
            placeholder="Contoh: Migrasi data dari Excel..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !qty || !hargaModal}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
