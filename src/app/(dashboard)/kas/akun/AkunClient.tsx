'use client'

import { useState } from 'react'
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { createAccount, updateAccount } from '@/actions/accounts'
import type { Account } from '@/types/database'

interface AkunClientProps {
  initialAccounts: Account[]
}

export function AkunClient({ initialAccounts }: AkunClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<'KAS' | 'BANK' | 'BRANKAS'>('BANK')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function openNewForm() {
    setEditingAccount(null)
    setName('')
    setType('BANK')
    setIsActive(true)
    setSortOrder(accounts.length + 1)
    setError('')
    setIsFormOpen(true)
  }

  function openEditForm(acc: Account) {
    setEditingAccount(acc)
    setName(acc.name)
    setType(acc.type as 'KAS' | 'BANK' | 'BRANKAS')
    setIsActive(acc.is_active)
    setSortOrder(acc.sort_order)
    setError('')
    setIsFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (editingAccount) {
      const result = await updateAccount(editingAccount.id, {
        name,
        type,
        is_active: isActive,
        sort_order: sortOrder,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        setIsFormOpen(false)
        window.location.reload()
      }
    } else {
      const result = await createAccount({
        name,
        type,
        is_active: isActive,
        sort_order: sortOrder,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        setIsFormOpen(false)
        window.location.reload()
      }
    }
    setLoading(false)
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={openNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap w-16">Urutan</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Nama Akun</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Tipe</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap w-24">Status</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{acc.sort_order}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{acc.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <CheckCircle className="w-3 h-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                        <XCircle className="w-3 h-3" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openEditForm(acc)}>
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                    Belum ada akun keuangan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Akun"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: BCA, Kas Tunai..."
            required
            className="w-full"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Akun</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'KAS' | 'BANK' | 'BRANKAS')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="BANK">BANK (Rekening/Transfer/QRIS)</option>
              <option value="KAS">KAS (Uang Laci/Toko)</option>
              <option value="BRANKAS">BRANKAS (Simpanan Tunai)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Hati-hati mengubah tipe jika akun sudah pernah digunakan bertransaksi.</p>
          </div>

          <Input
            label="Urutan Tampil (Sort Order)"
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full"
          />

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Akun Aktif (Muncul di Form)</span>
          </label>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
