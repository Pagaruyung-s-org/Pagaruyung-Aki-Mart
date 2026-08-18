'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '@/actions/master'
import { useRouter } from 'next/navigation'
import type { ExpenseCategory } from '@/types/database'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

interface KategoriTableProps {
  categories: ExpenseCategory[]
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null
}

export function KategoriTable({ categories: initial, role }: KategoriTableProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExpenseCategory | null>(null)
  const [itemToDelete, setItemToDelete] = useState<ExpenseCategory | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

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
  } = usePagination(initial, 10)

  function openCreate() { setEditItem(null); setError(''); setModalOpen(true) }
  function openEdit(c: ExpenseCategory) { setEditItem(c); setError(''); setModalOpen(true) }
  function openDelete(c: ExpenseCategory) { setItemToDelete(c); setError(''); setDeleteModalOpen(true) }

  async function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = editItem
        ? await updateExpenseCategory(editItem.id, formData)
        : await createExpenseCategory(formData)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setModalOpen(false)
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!itemToDelete) return
    setError('')
    startTransition(async () => {
      const result = await deleteExpenseCategory(itemToDelete.id)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setDeleteModalOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} id="tambah-kategori-btn"><Plus className="h-4 w-4" /> Tambah Kategori</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {initial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Tag className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Belum ada kategori biaya</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Kode</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Kategori</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.kode_kategori}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nama_kategori}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
        <form action={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">{error}</div>}

          <Input label="Nama Kategori" name="nama_kategori" id="nama_kategori" defaultValue={editItem?.nama_kategori} required placeholder="mis: Transportasi" />
          {editItem && <input type="hidden" name="status" value={editItem.status ? 'true' : 'false'} />}
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={isPending} className="flex-1">{editItem ? 'Simpan' : 'Tambah'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Hapus Kategori" size="sm">
        <div className="mt-4 space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus kategori <span className="font-semibold text-gray-900">{itemToDelete?.nama_kategori}</span>? Tindakan ini tidak dapat dibatalkan.
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
