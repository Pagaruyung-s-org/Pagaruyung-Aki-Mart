'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Lock, Trash2 } from 'lucide-react'
import { OpeningBalanceModal } from './OpeningBalanceModal'
import { deleteOpeningBalance } from '@/actions/opening-balance'
import { useToast } from '@/components/ui/Toast'
import { formatRupiah } from '@/lib/utils'

export function OpeningBalancePanel({
  openingBalances,
  products,
  userRole
}: {
  openingBalances: any[]
  products: any[]
  userRole: string | null
}) {
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedBalance, setSelectedBalance] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showToast } = useToast()

  const getProductName = (p: any) => {
    if (!p) return '-'
    if (p.kategori === 'Air Aki') return p.merk
    return [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Hapus saldo awal untuk produk ini? (Qty dan HPP akan direset)')) return

    setIsDeleting(true)
    try {
      const result = await deleteOpeningBalance(productId)
      if (result.success) {
        showToast('success', result.message)
      } else {
        showToast('error', result.error)
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan')
    } finally {
      setIsDeleting(false)
    }
  }

  // Combine products with their opening balances
  const combined = products.map(p => {
    const ob = openingBalances.find(b => b.product_id === p.id)
    return { product: p, balance: ob }
  })

  const filtered = combined.filter(({ product }) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = getProductName(product).toLowerCase()
    return name.includes(q) || product.kode_produk.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
        <Lock className="h-5 w-5 text-blue-600 shrink-0" />
        <div>
          <strong>Aturan Saldo Awal (Opening Balance):</strong> Saldo awal hanya bisa diinput 1 kali per barang. Anda bisa mengedit saldo awal selama belum ada transaksi (pembelian/penjualan) yang terjadi. Setelah ada transaksi, saldo awal akan <strong>terkunci (Locked)</strong> secara permanen.
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white placeholder-gray-400"
            />
          </div>
          <div className="text-sm text-gray-500">
            Total {filtered.length} produk
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-900">Produk</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-right">Qty Awal</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-right">Harga Modal</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(({ product, balance }) => (
                <tr key={product.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{getProductName(product)}</div>
                    <div className="text-xs font-mono text-gray-500">{product.kode_produk}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {balance ? (
                      <span className="font-medium text-gray-900">{balance.qty}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {balance ? (
                      <span className="font-medium text-gray-900">{formatRupiah(balance.harga_modal)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {balance ? (
                      balance.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                          <Lock className="h-3 w-3" /> Terkunci
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-green-100 text-green-700">
                          <Edit2 className="h-3 w-3" /> Bisa Diedit
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Belum Diinput
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {balance ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product)
                            setSelectedBalance(balance)
                            setIsModalOpen(true)
                          }}
                          disabled={balance.is_locked}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Edit Saldo Awal"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={balance.is_locked || isDeleting}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                          title="Hapus Saldo Awal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setSelectedBalance(null)
                          setIsModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Input
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OpeningBalanceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProduct(null)
          setSelectedBalance(null)
        }}
        product={selectedProduct}
        existingBalance={selectedBalance}
      />
    </div>
  )
}
