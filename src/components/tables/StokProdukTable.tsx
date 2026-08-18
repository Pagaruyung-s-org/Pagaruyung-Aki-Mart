'use client'

import { useState, useRef, useEffect } from 'react'
import { formatRupiah, getStokStatus } from '@/lib/utils'
import { Boxes, Search, Filter } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { FilterPopup, type FilterSection } from '@/components/ui/FilterPopup'

interface Batch {
  id: string
  qty_tersedia: number
  harga_modal_unit: number
  tanggal_masuk: string
}

interface Product {
  id: string
  kode_produk: string
  merk: string
  kategori: string
  kode_baterai: string | null
  kapasitas_ah: number
  harga_jual: number
  qty_stok: number
}

interface StokProdukTableProps {
  products: Product[]
  batchByProduct: Record<string, Batch[]>
  isAirAki?: boolean
  role?: string
}

export function StokProdukTable({ products, batchByProduct, isAirAki, role }: StokProdukTableProps) {
  const [search, setSearch] = useState('')

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
  // Radio filter states
  const [filterType, setFilterType] = useState('ALL')
  const [filterKodeBaterai, setFilterKodeBaterai] = useState('ALL')
  // Stok sort
  const [sortStok, setSortStok] = useState<'ASC' | 'DESC' | ''>('')

  // Unique option values
  const uniqueMerks = Array.from(new Set(products.map((p) => p.merk))).filter(Boolean).sort() as string[]
  const uniqueKategoris = Array.from(new Set(products.map((p) => p.kategori))).filter(Boolean).sort() as string[]
  const uniqueTypes = Array.from(new Set(products.map((p) => (p as any).type))).filter(Boolean).sort() as string[]
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
  }

  function handleReset() {
    setFilterMerk([])
    setFilterKategori([])
    setFilterKapasitas([])
    setFilterType('ALL')
    setFilterKodeBaterai('ALL')
    setSortStok('')
  }

  const activeCount =
    filterMerk.length +
    filterKategori.length +
    filterKapasitas.length +
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
  ]

  // Filtering
  const filtered = products.filter((p) => {
    const matchSearch =
      p.merk.toLowerCase().includes(search.toLowerCase()) ||
      p.kode_produk.toLowerCase().includes(search.toLowerCase()) ||
      p.kategori.toLowerCase().includes(search.toLowerCase()) ||
      (p.kode_baterai ?? '').toLowerCase().includes(search.toLowerCase()) ||
      ((p as any).type ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.kapasitas_ah?.toString().includes(search) ||
      p.harga_jual?.toString().includes(search)
    const matchMerk = filterMerk.length === 0 || filterMerk.includes(p.merk)
    const matchKategori = filterKategori.length === 0 || filterKategori.includes(p.kategori)
    const matchType = filterType === 'ALL' || (p as any).type === filterType
    const matchKodeBaterai = filterKodeBaterai === 'ALL' || p.kode_baterai === filterKodeBaterai
    const matchKapasitas = filterKapasitas.length === 0 || filterKapasitas.includes(p.kapasitas_ah?.toString())

    return matchSearch && matchMerk && matchKategori && matchType && matchKodeBaterai && matchKapasitas
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
    goToPrevPage
  } = usePagination(sorted, 10)

  if (!products || products.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Boxes className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Belum ada produk</p>
        </div>
      </div>
    )
  }

  const showModal = role !== 'ADMIN'

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4">
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

        <div className="flex gap-2">
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
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{isAirAki ? 'Nama / Varian' : 'Merk'}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kode Baterai</th>}
                {!isAirAki && <th className="text-center px-4 py-3 font-medium text-gray-600">Kapasitas (AH)</th>}
                <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Jual</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stok</th>
                {showModal && <th className="text-right px-4 py-3 font-medium text-gray-600">Modal</th>}
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={showModal ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada produk yang sesuai.
                  </td>
                </tr>
              ) : (
                currentData.map((p) => {
                  const stok = getStokStatus(p.qty_stok)
                  const productBatches = batchByProduct[p.id] ?? []

                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.kode_produk}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.merk}</td>
                      <td className="px-4 py-3 text-gray-600">{p.kategori}</td>
                      {!isAirAki && <td className="px-4 py-3 text-center text-gray-600">{p.kode_baterai ?? '—'}</td>}
                      {!isAirAki && <td className="px-4 py-3 text-center text-gray-700">{p.kapasitas_ah}</td>}
                      <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.harga_jual)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${stok.color}`}>{p.qty_stok}</span>
                        <span className={`text-xs ml-1 ${stok.color}`}>({stok.label})</span>
                      </td>
                      {showModal && (
                        <td className="px-4 py-3 text-right">
                          {productBatches.length === 0 ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (
                            <div className="flex flex-col gap-1 text-right">
                              {productBatches.map((b: any) => (
                                <div key={b.id} className="flex justify-end gap-2 items-center text-xs">
                                  <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{b.qty_tersedia} pcs</span>
                                  <span className="font-medium text-gray-900 w-20">{formatRupiah(b.harga_modal_unit)}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
    </div>
  )
}

