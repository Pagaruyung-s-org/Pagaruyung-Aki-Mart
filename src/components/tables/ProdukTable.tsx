'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Package, Info, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Modal } from '@/components/ui/Modal'
import { formatRupiah, getStokStatus, formatDate } from '@/lib/utils'
import { createProduct, updateProduct, toggleProductStatus } from '@/actions/master'
import { useRouter } from 'next/navigation'
import type { Product } from '@/types/database'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

interface ProductWithModal extends Product {
  modal?: number
  modal_terbaru?: number
  tgl_terbaru?: string | null
  modal_terlama?: number
  tgl_terlama?: string | null
}

interface ProdukTableProps {
  products: ProductWithModal[]
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null
  isAirAki?: boolean
}

export function ProdukTable({ products, role, isAirAki }: ProdukTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [toastMsg, setToastMsg] = useState<{type: 'success'|'error', msg: string} | null>(null)
  const [hargaJual, setHargaJual] = useState<number | ''>('')
  const [kategori, setKategori] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [filterMerk, setFilterMerk] = useState('ALL')
  const [filterKategori, setFilterKategori] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [filterKodeBaterai, setFilterKodeBaterai] = useState('ALL')
  const [filterKapasitas, setFilterKapasitas] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterStok, setFilterStok] = useState('ALL')

  // Extract unique values for dropdowns
  const uniqueMerks = Array.from(new Set(products.map(p => p.merk))).filter(Boolean)
  const uniqueKategoris = Array.from(new Set(products.map(p => p.kategori))).filter(Boolean)
  const uniqueTypes = Array.from(new Set(products.map(p => p.type))).filter(Boolean)
  const uniqueKodeBaterai = Array.from(new Set(products.map(p => p.kode_baterai))).filter(Boolean)
  const uniqueKapasitas = Array.from(new Set(products.map(p => p.kapasitas_ah))).filter(Boolean).sort((a, b) => Number(a) - Number(b))

  const filtered = products.filter(p => {
    const matchSearch = p.merk.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_produk.toLowerCase().includes(search.toLowerCase()) ||
      p.kategori.toLowerCase().includes(search.toLowerCase()) ||
      (p.kode_baterai ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.type ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.kapasitas_ah.toString().includes(search) ||
      p.harga_jual.toString().includes(search)

    const matchMerk = filterMerk === 'ALL' || p.merk === filterMerk
    const matchKategori = filterKategori === 'ALL' || p.kategori === filterKategori
    const matchType = filterType === 'ALL' || p.type === filterType
    const matchKodeBaterai = filterKodeBaterai === 'ALL' || p.kode_baterai === filterKodeBaterai
    const matchKapasitas = filterKapasitas === 'ALL' || p.kapasitas_ah.toString() === filterKapasitas
    
    let matchStatus = true
    if (filterStatus === 'AKTIF') matchStatus = p.status === true
    if (filterStatus === 'NONAKTIF') matchStatus = p.status === false

    let matchStok = true
    if (filterStok !== 'ALL') {
      const stokObj = getStokStatus(p.qty_stok)
      matchStok = stokObj.label === filterStok
    }

    return matchSearch && matchMerk && matchKategori && matchType && matchKodeBaterai && matchKapasitas && matchStatus && matchStok
  })

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
  } = usePagination(filtered, 10)

  function openCreate() { 
    setEditProduct(null); 
    setError(''); 
    setKategori('Aki Mobil'); 
    setHargaJual('');
    setModalOpen(true); 
  }
  function openEdit(p: Product) { 
    setEditProduct(p); 
    setError(''); 
    setKategori(p.kategori); 
    setHargaJual(p.harga_jual);
    setModalOpen(true); 
  }

  async function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = editProduct
        ? await updateProduct(editProduct.id, formData)
        : await createProduct(formData)

      if (!result.success) {
        setError(result.error ?? 'Terjadi kesalahan')
        return
      }
      setModalOpen(false)
      router.refresh()
    })
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    startTransition(async () => {
      await toggleProductStatus(id, !currentStatus)
      router.refresh()
    })
  }

  const stokStatus = (qty: number) => getStokStatus(qty)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari merk, kode, kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}>
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          {role !== 'OWNER' && (
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Tambah Produk
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Merk</label>
            <select value={filterMerk} onChange={e => setFilterMerk(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
              <option value="ALL">Semua Merk</option>
              {uniqueMerks.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
            <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
              <option value="ALL">Semua Kategori</option>
              {uniqueKategoris.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {!isAirAki && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
                  <option value="ALL">Semua Type</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kode Baterai</label>
                <select value={filterKodeBaterai} onChange={e => setFilterKodeBaterai(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
                  <option value="ALL">Semua Kode</option>
                  {uniqueKodeBaterai.map(kb => <option key={kb} value={kb}>{kb}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kapasitas (AH)</label>
                <select value={filterKapasitas} onChange={e => setFilterKapasitas(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
                  <option value="ALL">Semua Kapasitas</option>
                  {uniqueKapasitas.map(k => <option key={k} value={k}>{k} AH</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="NONAKTIF">Non-Aktif</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stok</label>
            <select value={filterStok} onChange={e => setFilterStok(e.target.value)} className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 border bg-white">
              <option value="ALL">Semua Stok</option>
              <option value="Aman">Aman</option>
              <option value="Menipis">Menipis</option>
              <option value="Habis">Habis</option>
            </select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-sm text-gray-500">
        <span>{filtered.length} produk</span>
        <span>·</span>
        <span>{filtered.filter(p => p.status).length} aktif</span>
        <span>·</span>
        <span className="text-orange-500">{filtered.filter(p => p.qty_stok <= 3).length} hampir habis</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{isAirAki ? 'Nama / Varian' : 'Merk'}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>}
                {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kode Baterai</th>}
                {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kapasitas (AH)</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Jual</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stok</th>
                <th className="px-4 py-3 font-semibold text-gray-900 text-center">Status</th>
                {(role === 'SUPER_ADMIN' || role === 'OWNER') && (
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Modal</th>
                )}
                {role !== 'OWNER' && (
                  <th className="px-4 py-3 font-semibold text-gray-900 text-center w-24">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-gray-500">
                    Belum ada produk.
                  </td>
                </tr>
              ) : (
                currentData.map((p, i) => {
                  const stok = stokStatus(p.qty_stok)
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.kode_produk}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.merk}</td>
                      <td className="px-4 py-3 text-gray-600">{p.kategori}</td>
                      {!isAirAki && <td className="px-4 py-3 text-center text-gray-600">{p.type ?? '—'}</td>}
                      {!isAirAki && <td className="px-4 py-3 text-center text-gray-600">{p.kode_baterai ?? '—'}</td>}
                      {!isAirAki && <td className="px-4 py-3 text-center text-gray-700">{p.kapasitas_ah} AH</td>}
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(p.harga_jual)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${stok.color}`}>{p.qty_stok}</span>
                        <span className={`text-xs ml-1 ${stok.color}`}>({stok.label})</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.status ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      {(role === 'SUPER_ADMIN' || role === 'OWNER') && (
                        <td className="px-4 py-3 text-right text-gray-600 font-medium">
                          {formatRupiah(p.modal ?? 0)}
                        </td>
                      )}
                      {role !== 'OWNER' && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggle(p.id, p.status)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              {p.status ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
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

      {/* Modal Form */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
        size="md"
      >
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <Input
              label={isAirAki ? 'Nama / Varian (mis: Air Keras Merah)' : 'Merk (mis: Furukawa)'}
              name="merk"
              id="merk"
              defaultValue={editProduct?.merk}
              required
              placeholder={isAirAki ? 'Air Keras Merah 1L' : 'mis: Furukawa'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kategori"
              name="kategori"
              id="kategori"
              defaultValue={isAirAki ? 'Air Aki' : editProduct?.kategori}
              required
              readOnly={isAirAki}
              className={isAirAki ? 'bg-gray-50' : ''}
              placeholder="mis: Maintenance Free"
            />
            {!isAirAki && (
              <Input
                label="Type (opsional)"
                name="type"
                id="type"
                defaultValue={editProduct?.type ?? ''}
                placeholder="mis: MF"
              />
            )}
          </div>
          {!isAirAki && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kode Baterai (opsional)"
                name="kode_baterai"
                id="kode_baterai"
                defaultValue={editProduct?.kode_baterai ?? ''}
                placeholder="mis: FB900"
              />
              <Input
                label="Kapasitas (AH)"
                name="kapasitas_ah"
                id="kapasitas_ah"
                type="number"
                step="0.5"
                min="0"
                defaultValue={editProduct?.kapasitas_ah}
                required
                placeholder="mis: 45"
              />
            </div>
          )}
          {isAirAki && (
            <input type="hidden" name="kapasitas_ah" value="0" />
          )}
          <InputCurrency
            label="Harga Jual (Rp)"
            name="harga_jual"
            id="harga_jual"
            min="0"
            value={hargaJual}
            onChange={(val) => setHargaJual(val)}
            required
            placeholder="mis: 750000"
          />
          {editProduct && (
            <input type="hidden" name="status" value={editProduct.status ? 'true' : 'false'} />
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={isPending} className="flex-1">
              {editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
