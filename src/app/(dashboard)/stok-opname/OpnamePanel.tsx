'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OpnameHistoryTable } from './OpnameHistoryTable'
import { StartOpnameModal } from './StartOpnameModal'
import { savePhysicalCount, completeOpnameSession, getLatestHargaModalForProduct, cancelOpnameSession } from '@/actions/stok-opname'
import { useToast } from '@/components/ui/Toast'
import { Play, Save, CheckCircle2, AlertTriangle, Search, ClipboardCheck, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

export function OpnamePanel({
  activeSession,
  sessionHistory,
  products
}: {
  activeSession: any
  sessionHistory: any[]
  products: any[]
}) {
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { showToast } = useToast()
  const router = useRouter()

  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (activeSession?.opname_items) {
      setItems(
        activeSession.opname_items.map((item: any) => ({
          ...item,
          input_qty: item.physical_qty !== null ? item.physical_qty.toString() : '',
          input_keterangan: item.keterangan || '',
          input_harga_modal: item.harga_modal_aktual !== null ? item.harga_modal_aktual?.toString() : '',
        }))
      )
    } else {
      setItems([])
    }
  }, [activeSession])

  const handleInputChange = (id: string, field: string, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const payload = items.map(item => ({
        product_id: item.product_id,
        physical_qty: item.input_qty === '' ? null : Number(item.input_qty),
        keterangan: item.input_keterangan,
        harga_modal_aktual: item.input_harga_modal === '' ? null : Number(item.input_harga_modal)
      })).filter(item => item.physical_qty !== null)

      const result = await savePhysicalCount(activeSession.id, payload as any)
      if (result.success) {
        showToast('success', result.message)
      } else {
        showToast('error', result.error)
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan jaringan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleComplete = async () => {
    const unfilled = items.filter(i => i.input_qty === '')
    if (unfilled.length > 0) {
      showToast('error', `Ada ${unfilled.length} produk yang belum diisi fisik-nya`)
      return
    }

    if (!confirm('Apakah Anda yakin ingin menyelesaikan sesi ini? Stok akan disesuaikan secara permanen.')) {
      return
    }

    setIsCompleting(true)
    try {
      // Auto-save draft before complete just in case
      const payload = items.map(item => ({
        product_id: item.product_id,
        physical_qty: Number(item.input_qty),
        keterangan: item.input_keterangan,
        harga_modal_aktual: item.input_harga_modal === '' ? null : Number(item.input_harga_modal)
      }))
      await savePhysicalCount(activeSession.id, payload)

      const result = await completeOpnameSession(activeSession.id)
      if (result.success) {
        showToast('success', result.message)
        router.refresh()
      } else {
        showToast('error', result.error)
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan jaringan')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelModalOpen(false)
    setIsCompleting(true)
    try {
      const result = await cancelOpnameSession(activeSession.id)
      if (result.success) {
        showToast('success', result.message)
        router.refresh()
      } else {
        showToast('error', result.error)
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan jaringan')
    } finally {
      setIsCompleting(false)
    }
  }

  const getProductName = (p: any) => {
    if (!p) return '-'
    if (p.kategori === 'Air Aki') return p.merk
    return [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
  }

  const filteredItems = items.filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = getProductName(item.products).toLowerCase()
    return name.includes(q) || item.products?.kode_produk.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Jika ADA Sesi Aktif */}
      {activeSession ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Header Sesi Aktif */}
          <div className="bg-blue-600 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                Sesi Aktif: {activeSession.kode_opname}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Batas penyelesaian: Hari ini jam 23:59. Lewat dari waktu ini sesi otomatis kadaluarsa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isSaving || isCompleting}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <X className="h-4 w-4" /> {isCompleting ? 'Memproses...' : 'Batal Opname'}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || isCompleting}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Save className="h-4 w-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
              </button>
              <button
                onClick={handleComplete}
                disabled={isSaving || isCompleting}
                className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4" /> {isCompleting ? 'Memproses...' : 'Selesaikan Opname'}
              </button>
            </div>
          </div>

          {/* Body Sesi Aktif */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk dalam sesi..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
              />
            </div>
            <div className="text-sm font-medium text-gray-600">
              Total: {items.length} item
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Produk</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-center w-24">Sistem</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-center w-32">Fisik (Input)</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-center w-24">Selisih</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 min-w-[200px]">Harga / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const selisih = item.input_qty !== '' ? Number(item.input_qty) - item.system_qty_snapshot : null
                  const isSurplus = selisih !== null && selisih > 0
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{getProductName(item.products)}</div>
                        <div className="text-xs font-mono text-gray-500">{item.products?.kode_produk}</div>
                      </td>
                      <td className="px-4 py-3 text-center bg-gray-50 font-medium">
                        {item.system_qty_snapshot}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={item.input_qty}
                          onChange={(e) => handleInputChange(item.id, 'input_qty', e.target.value)}
                          className={`w-full px-2 py-1.5 border rounded text-center focus:ring-2 focus:ring-blue-500 ${
                            item.input_qty === '' ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                          }`}
                          placeholder="?"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {selisih === null ? '-' : (
                          <span className={`inline-flex font-bold ${
                            selisih === 0 ? 'text-gray-400' :
                            selisih > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {selisih > 0 ? '+' : ''}{selisih}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 space-y-2">
                        {/* Harga Modal Input (Only if surplus) */}
                        {isSurplus && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">HPP Baru:</span>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">Rp</span>
                              <input
                                type="number"
                                min="0"
                                value={item.input_harga_modal}
                                onChange={(e) => handleInputChange(item.id, 'input_harga_modal', e.target.value)}
                                placeholder="Auto (Batch Terakhir)"
                                className="w-full pl-6 pr-2 py-1 border border-green-300 bg-green-50 rounded text-xs focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          </div>
                        )}
                        <input
                          type="text"
                          value={item.input_keterangan}
                          onChange={(e) => handleInputChange(item.id, 'input_keterangan', e.target.value)}
                          placeholder={selisih === 0 ? "Opsional" : "Keterangan wajib diisi..."}
                          className={`w-full px-2 py-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-500 ${
                            selisih !== null && selisih !== 0 && !item.input_keterangan
                              ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Jika TIDAK ADA Sesi Aktif */
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Tidak Ada Sesi Opname Aktif</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              Sesi stok opname digunakan untuk menyesuaikan stok sistem dengan fisik gudang. Sesi hanya berlaku di hari yang sama.
            </p>
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Play className="h-4 w-4" /> Mulai Opname Baru
            </button>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Riwayat Opname Selesai</h3>
            <OpnameHistoryTable history={sessionHistory} />
          </div>

          <StartOpnameModal
            isOpen={isStartModalOpen}
            onClose={() => setIsStartModalOpen(false)}
            products={products}
          />
        </div>
      )}
      
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Batalkan Sesi Opname"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin membatalkan sesi opname ini? Semua data draft yang telah diisi akan terhapus.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={handleCancel}
              disabled={isCompleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isCompleting ? 'Memproses...' : 'Ya, Batalkan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
