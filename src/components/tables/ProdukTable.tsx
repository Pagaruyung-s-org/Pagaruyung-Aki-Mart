'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Filter, ChevronDown, ChevronRight, X, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Modal } from '@/components/ui/Modal'
import { formatRupiah, getStokStatus } from '@/lib/utils'
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

import { FilterPopup, type FilterSection } from '@/components/ui/FilterPopup'

// ─── Main Component ──────────────────────────────────────────────────

export function ProdukTable({ products, role, isAirAki }: ProdukTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [hargaJual, setHargaJual] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Filter popup
  const [showFilters, setShowFilters] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    if (showFilters) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilters])

  // Checkbox filter states
  const [filterMerk, setFilterMerk] = useState<string[]>([])
  const [filterKategori, setFilterKategori] = useState<string[]>([])
  const [filterKapasitas, setFilterKapasitas] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState('ALL')
  // Radio filter states
  const [filterType, setFilterType] = useState('ALL')
  const [filterKodeBaterai, setFilterKodeBaterai] = useState('ALL')
  // Stok sort
  const [sortStok, setSortStok] = useState<'ASC' | 'DESC' | ''>('')

  // Unique option values
  const uniqueMerks = Array.from(new Set(products.map((p) => p.merk))).filter(Boolean).sort() as string[]
  const uniqueKategoris = Array.from(new Set(products.map((p) => p.kategori))).filter(Boolean).sort() as string[]
  const uniqueTypes = Array.from(new Set(products.map((p) => p.type))).filter(Boolean).sort() as string[]
  const uniqueKodeBaterai = Array.from(new Set(products.map((p) => p.kode_baterai))).filter(Boolean).sort() as string[]
  const uniqueKapasitas = Array.from(new Set(products.map((p) => p.kapasitas_ah)))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b)) as number[]

  function handleCheckboxChange(key: string, value: string, checked: boolean) {
    const setters: Record<string, React.Dispatch<React.SetStateAction<string[]>>> = {
      merk: setFilterMerk,
      kategori: setFilterKategori,
      kapasitas: setFilterKapasitas,
    }
    const setter = setters[key]
    if (!setter) return
    setter((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)))
  }

  function handleRadioChange(key: string, value: string) {
    if (key === 'type') setFilterType(value)
    if (key === 'kodeBaterai') setFilterKodeBaterai(value)
    if (key === 'status') setFilterStatus(value)
  }

  function handleReset() {
    setFilterMerk([])
    setFilterKategori([])
    setFilterKapasitas([])
    setFilterStatus('ALL')
    setFilterType('ALL')
    setFilterKodeBaterai('ALL')
    setSortStok('')
  }

  const activeCount =
    filterMerk.length +
    filterKategori.length +
    filterKapasitas.length +
    (filterStatus !== 'ALL' ? 1 : 0) +
    (filterType !== 'ALL' ? 1 : 0) +
    (filterKodeBaterai !== 'ALL' ? 1 : 0) +
    (sortStok !== '' ? 1 : 0)

  const filterSections: FilterSection[] = [
    {
      key: 'merk',
      label: 'Merk',
      type: 'checkbox',
      options: uniqueMerks.map((m) => ({ value: m, label: m })),
    },
    {
      key: 'kategori',
      label: 'Kategori',
      type: 'checkbox',
      options: uniqueKategoris.map((k) => ({ value: k, label: k })),
    },
    ...(!isAirAki
      ? [
          {
            key: 'type',
            label: 'Type',
            type: 'radio' as const,
            options: uniqueTypes.map((t) => ({ value: t, label: t })),
          },
          {
            key: 'kodeBaterai',
            label: 'Kode Baterai',
            type: 'radio' as const,
            options: uniqueKodeBaterai.map((kb) => ({ value: kb, label: kb })),
          },
          {
            key: 'kapasitas',
            label: 'Kapasitas (AH)',
            type: 'checkbox' as const,
            options: uniqueKapasitas.map((k) => ({ value: k.toString(), label: `${k} AH` })),
          },
        ]
      : []),
    {
      key: 'status',
      label: 'Status',
      type: 'radio',
      options: [
        { value: 'AKTIF', label: 'Aktif' },
        { value: 'NONAKTIF', label: 'Non-Aktif' },
      ],
    },
  ]

  // Filtering
  const filtered = products.filter((p) => {
    const matchSearch =
      p.merk.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_produk.toLowerCase().includes(search.toLowerCase()) ||
      p.kategori.toLowerCase().includes(search.toLowerCase()) ||
      (p.kode_baterai ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.type ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.kapasitas_ah.toString().includes(search) ||
      p.harga_jual.toString().includes(search)
    const matchMerk = filterMerk.length === 0 || filterMerk.includes(p.merk)
    const matchKategori = filterKategori.length === 0 || filterKategori.includes(p.kategori)
    const matchType = filterType === 'ALL' || p.type === filterType
    const matchKodeBaterai = filterKodeBaterai === 'ALL' || p.kode_baterai === filterKodeBaterai
    const matchKapasitas = filterKapasitas.length === 0 || filterKapasitas.includes(p.kapasitas_ah.toString())
    let matchStatus = true
    if (filterStatus === 'AKTIF') matchStatus = p.status === true
    if (filterStatus === 'NONAKTIF') matchStatus = p.status === false

    return matchSearch && matchMerk && matchKategori && matchType && matchKodeBaterai && matchKapasitas && matchStatus
  })

  // Sort by stok
  const sorted = sortStok
    ? [...filtered].sort((a, b) => sortStok === 'ASC' ? a.qty_stok - b.qty_stok : b.qty_stok - a.qty_stok)
    : filtered

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalItems,
    goToNextPage,
    goToPrevPage,
  } = usePagination(sorted, 10)

  function openCreate() {
    setEditProduct(null)
    setError('')
    setHargaJual('')
    setModalOpen(true)
  }
  function openEdit(p: Product) {
    setEditProduct(p)
    setError('')
    setHargaJual(p.harga_jual)
    setModalOpen(true)
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari merk, kode, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
            />
          </div>

          {/* Filter Button + Popup */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                showFilters || activeCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-bold">
                  {activeCount}
                </span>
              )}
            </button>

            {showFilters && (
              <FilterPopup
                sections={filterSections}
                checkboxValues={{
                  merk: filterMerk,
                  kategori: filterKategori,
                  kapasitas: filterKapasitas,
                }}
                radioValues={{
                  type: filterType,
                  kodeBaterai: filterKodeBaterai,
                  status: filterStatus,
                }}
                sortStok={sortStok}
                onCheckboxChange={handleCheckboxChange}
                onRadioChange={handleRadioChange}
                onSortStokChange={setSortStok}
                onReset={handleReset}
                activeCount={activeCount}
              />
            )}
          </div>
        </div>

        {role !== 'OWNER' && (
          <Button onClick={openCreate} className="w-full sm:w-auto shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Tambah Produk
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterMerk.map((m) => (
            <span key={m} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
              Merk: {m}
              <button onClick={() => setFilterMerk((prev) => prev.filter((v) => v !== m))} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {filterKategori.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
              Kategori: {k}
              <button onClick={() => setFilterKategori((prev) => prev.filter((v) => v !== k))} className="hover:text-purple-900"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {filterKapasitas.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
              {k} AH
              <button onClick={() => setFilterKapasitas((prev) => prev.filter((v) => v !== k))} className="hover:text-teal-900"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {filterStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
              Status: {filterStatus === 'AKTIF' ? 'Aktif' : 'Non-Aktif'}
              <button onClick={() => setFilterStatus('ALL')} className="hover:text-green-900"><X className="h-3 w-3" /></button>
            </span>
          )}
          {filterType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
              Type: {filterType}
              <button onClick={() => setFilterType('ALL')} className="hover:text-orange-900"><X className="h-3 w-3" /></button>
            </span>
          )}
          {filterKodeBaterai !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
              Kode Baterai: {filterKodeBaterai}
              <button onClick={() => setFilterKodeBaterai('ALL')} className="hover:text-yellow-900"><X className="h-3 w-3" /></button>
            </span>
          )}
          {sortStok !== '' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300 text-gray-700 text-xs font-medium">
              <ArrowUpDown className="h-3 w-3" />
              Stok {sortStok === 'ASC' ? '↑ Asc' : '↓ Desc'}
              <button onClick={() => setSortStok('')} className="hover:text-gray-900"><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-sm text-gray-500">
        <span>{sorted.length} produk</span>
        <span>·</span>
        <span>{sorted.filter((p) => p.status).length} aktif</span>
        <span>·</span>
        <span className="text-orange-500">{sorted.filter((p) => p.qty_stok <= 3).length} hampir habis</span>
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
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Stok
                  {sortStok !== '' && (
                    <span className="ml-1 text-blue-500">{sortStok === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </th>
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
          {isAirAki && <input type="hidden" name="kapasitas_ah" value="0" />}
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
