'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createUser, updateUserRoleAndPass, deleteUser } from '@/actions/users'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

export interface AppUser {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER'
  created_at: string
}

export function UserTable({ initial }: { initial: AppUser[] }) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<AppUser | null>(null)
  const [itemToDelete, setItemToDelete] = useState<AppUser | null>(null)
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
  function openEdit(u: AppUser) { setEditItem(u); setError(''); setModalOpen(true) }
  function openDelete(u: AppUser) { setItemToDelete(u); setError(''); setDeleteModalOpen(true) }

  async function handleSubmit(formData: FormData) {
    setError('')
    startTransition(async () => {
      const result = editItem
        ? await updateUserRoleAndPass(editItem.id, formData)
        : await createUser(formData)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setModalOpen(false)
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!itemToDelete) return
    setError('')
    startTransition(async () => {
      const result = await deleteUser(itemToDelete.id)
      if (!result.success) { setError(result.error ?? 'Error'); return }
      setDeleteModalOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Tambah User</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {initial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Tidak ada user</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal Dibuat</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    <span className={`px-2 py-1 rounded-full ${
                      u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'OWNER' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(u.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openDelete(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit User' : 'Tambah User'}>
        <form action={handleSubmit} className="space-y-4 mt-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input name="email" type="email" defaultValue={editItem?.email} required disabled={!!editItem} placeholder="user@kedaiki.com" />
              {editItem && <p className="text-xs text-gray-500 mt-1">Email tidak bisa diubah setelah dibuat.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input name="password" type="password" required={!editItem} placeholder={editItem ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 6 karakter'} minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select name="role" defaultValue={editItem?.role || 'ADMIN'} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900">
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Hapus User">
        <div className="mt-4 space-y-4">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus user <span className="font-semibold text-gray-900">{itemToDelete?.email}</span>? Tindakan ini tidak dapat dibatalkan.
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
