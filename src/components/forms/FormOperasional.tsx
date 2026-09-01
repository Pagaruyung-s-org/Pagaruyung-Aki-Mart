'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'

import { toInputDate } from '@/lib/utils'
import { createExpense } from '@/actions/transactions'

interface Category { id: string; nama_kategori: string; kode_kategori: string }
interface Employee { id: string; nama_karyawan: string }
interface Account { id: string; name: string; type: string; is_active: boolean }

export function FormOperasional({ 
  categories, 
  employees,
  accounts = [],
  onSuccess,
  onCancel 
}: { 
  categories: Category[]; 
  employees: Employee[];
  accounts?: Account[];
  role?: string;
  onSuccess?: () => void;
  onCancel?: () => void 
}) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [tanggal, setTanggal] = useState(toInputDate())
  const [categoryId, setCategoryId] = useState('')
  const defaultKas = accounts?.find(a => a.type === 'KAS')?.id || ''

  const [employeeId, setEmployeeId] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [nominal, setNominal] = useState('')
  const isAdmin = role === 'ADMIN'
  const defaultPaymentMethod = isAdmin ? 'CASH' : 'CASH'
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS' | 'BRANKAS'>(defaultPaymentMethod)
  const [accountId, setAccountId] = useState(defaultKas)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    startTransition(async () => {
      const result = await createExpense({
        tanggal,
        category_id: categoryId,
        employee_id: employeeId || undefined,
        keterangan: keterangan || undefined,
        nominal: Number(nominal),
        payment_method: paymentMethod,
        account_id: accountId,
      })

      if (!result.success) { setToast({ type: 'error', msg: result.error }); return }
      setToast({ type: 'success', msg: result.message })
      setNominal(''); setKeterangan(''); setCategoryId(''); setEmployeeId('')
      if (onSuccess) setTimeout(onSuccess, 1000)
    })
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {toast && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {toast.msg}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal" id="tanggal_ops" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            <Select
              label="Kategori"
              id="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              placeholder="-- Pilih Kategori --"
              options={categories.map(c => ({ value: c.id, label: c.nama_kategori }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Karyawan (opsional)"
              id="employee_id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="-- Pilih Karyawan --"
              options={[
                { value: '', label: '-- Kosongkan --' },
                ...employees.map(e => ({ value: e.id, label: e.nama_karyawan }))
              ]}
            />
            <Select
              label="Metode Bayar"
              id="payment_method_ops"
              value={paymentMethod}
              disabled={isAdmin}
              onChange={(e) => {
                const val = e.target.value as 'CASH' | 'TRANSFER' | 'QRIS' | 'BRANKAS';
                setPaymentMethod(val);
                if (val === 'CASH') {
                  setAccountId(accounts?.find(a => a.type === 'KAS')?.id || '');
                } else if (val === 'BRANKAS') {
                  setAccountId(accounts?.find(a => a.type === 'BRANKAS')?.id || '');
                } else {
                  setAccountId(accounts?.find(a => a.type === 'BANK')?.id || '');
                }
              }}
              options={[
                { value: 'CASH', label: 'Tunai (Kas Laci)' },
                { value: 'BRANKAS', label: 'Brankas Toko' },
                { value: 'TRANSFER', label: 'Transfer Bank' },
                { value: 'QRIS', label: 'QRIS' },
              ]}
            />
            <Select
              label="Sumber Dana (Akun)"
              id="account_id"
              value={accountId}
              disabled={isAdmin}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: '-- Pilih Akun --' },
                ...(accounts || [])
                  .filter(a => paymentMethod === 'CASH' ? a.type === 'KAS' : paymentMethod === 'BRANKAS' ? a.type === 'BRANKAS' : a.type === 'BANK')
                  .map(a => ({ value: a.id, label: a.name }))
              ]}
            />
          </div>
          <Input label="Keterangan" id="keterangan_ops" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi pengeluaran..." />
          <InputCurrency label="Nominal (Rp)" id="nominal_ops" min="1" value={nominal === '' ? '' : Number(nominal)} onChange={(val) => setNominal(val.toString())} required placeholder="0" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
          )}
          <Button type="submit" loading={isPending} id="submit-operasional">Simpan Pengeluaran</Button>
        </div>
      </form>
    </div>
  )
}
