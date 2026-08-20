'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Search } from 'lucide-react'
import { startOpnameSession } from '@/actions/stok-opname'
import { useToast } from '@/components/ui/Toast'

interface StartOpnameModalProps {
  isOpen: boolean
  onClose: () => void
  products: any[]
}

export function StartOpnameModal({ isOpen, onClose, products }: StartOpnameModalProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const filtered = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`]
      .filter(Boolean).join(' ').toLowerCase()
    return name.includes(q) || p.kode_produk.toLowerCase().includes(q)
  })

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((p) => p.id))
    }
  }

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return
    setIsSubmitting(true)
    try {
      const result = await startOpnameSession(selectedIds)
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

  const getProductName = (p: any) => {
    if (p.kategori === 'Air Aki') return p.merk
    return [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mulai Sesi Stok Opname" size="2xl">
      <div className="space-y-4">
        <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-100">
          Pilih produk yang ingin dihitung hari ini. Sesi akan otomatis berakhir pada jam 00:00 tengah malam.
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col max-h-[50vh]">
          <div className="overflow-y-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600">Kode</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Nama Produk</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-center">Stok Sistem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Tidak ada produk ditemukan
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => handleToggle(p.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.kode_produk}</td>
                      <td className="px-4 py-2.5 text-gray-900 font-medium">{getProductName(p)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          {p.qty_stok}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Terpilih: <span className="font-semibold text-blue-600">{selectedIds.length}</span> produk
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Mulai Sesi'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
