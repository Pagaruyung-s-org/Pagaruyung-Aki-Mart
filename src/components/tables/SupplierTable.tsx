'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, Pencil, Trash2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createSupplier, updateSupplier, deleteSupplier } from '@/actions/master'
import { useRouter } from 'next/navigation'
import type { Supplier } from '@/types/database'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

interface SupplierTableProps {
  initial: Supplier[]
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null
}

export function SupplierTable({ initial, role }: SupplierTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Supplier | null>(null)
  const [itemToDelete, setItemToDelete] = useState<Supplier | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = initial.filter(s =>
    s.nama_supplier.toLowerCase().includes(search.toLowerCase()) ||
    s.kode_supplier.toLowerCase().includes(search.toLowerCase())
  )

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

  function openCreate() { setEditItem(null); setError(''); setModalOpen(true) }
  function openEdit(s: Supplier) { setEditItem(s); setError(''); setModalOpen(true) }
  function openDelete(s: Supplier) { setItemToDelete(s); setError(''); setDeleteModalOpen(true) }

  async function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = editItem
        ? await updateSupplier(editItem.id, formData)
        : await createSupplier(formData)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setModalOpen(false)
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!itemToDelete) return
    setError('')
    startTransition(async () => {
      const result = await deleteSupplier(itemToDelete.id)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setDeleteModalOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau kode supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
          />
        </div>
        {role !== 'OWNER' && (
          <Button onClick={openCreate} id="tambah-supplier-btn">
            <Plus className="h-4 w-4" /> Tambah Supplier
          </Button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Tidak ada supplier ditemukan</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telepon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Alamat</th>
                {role !== 'OWNER' && (
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {currentData.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.kode_supplier}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nama_supplier}</td>
                  <td className="px-4 py-3 text-gray-600">{s.telepon ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.alamat ?? '—'}</td>
                  {role !== 'OWNER' && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openDelete(s)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
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
        </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Supplier' : 'Tambah Supplier'}>
        <form action={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">{error}</div>}
          <div className="grid grid-cols-1 gap-3">
            <Input label="Nama Supplier" name="nama_supplier" id="nama_supplier" defaultValue={editItem?.nama_supplier} required placeholder="PT. Distributor Aki" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telepon" name="telepon" id="telepon" defaultValue={editItem?.telepon ?? ''} placeholder="08xxx" />
            <Input label="Email (opsional)" name="email" id="email" type="email" defaultValue={editItem?.email ?? ''} placeholder="email@supplier.com" />
          </div>
          <Input label="Alamat" name="alamat" id="alamat" defaultValue={editItem?.alamat ?? ''} placeholder="Jl. ..." />
          {editItem && <input type="hidden" name="status" value={editItem.status ? 'true' : 'false'} />}
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={isPending} className="flex-1">{editItem ? 'Simpan' : 'Tambah'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Hapus Supplier">
        <div className="mt-4 space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus supplier <span className="font-semibold text-gray-900">{itemToDelete?.nama_supplier}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>Batal</Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
