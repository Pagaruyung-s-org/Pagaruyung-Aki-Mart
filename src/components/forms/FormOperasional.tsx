'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card'
import { toInputDate } from '@/lib/utils'
import { createExpense } from '@/actions/transactions'

interface Category { id: string; nama_kategori: string; kode_kategori: string }
interface Employee { id: string; nama_karyawan: string }

export function FormOperasional({ categories, employees }: { categories: Category[]; employees: Employee[] }) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [tanggal, setTanggal] = useState(toInputDate())
  const [categoryId, setCategoryId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [nominal, setNominal] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH')

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
      })

      if (!result.success) { setToast({ type: 'error', msg: result.error }); return }
      setToast({ type: 'success', msg: result.message })
      setNominal(''); setKeterangan(''); setCategoryId(''); setEmployeeId('')
    })
  }

  return (
    <Card className="w-full">
      <CardHeader><h2 className="text-sm font-semibold text-gray-900">Catat Biaya Operasional</h2></CardHeader>
      <form onSubmit={handleSubmit}>
        <CardBody className="space-y-4">
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
              options={employees.map(e => ({ value: e.id, label: e.nama_karyawan }))}
            />
            <Select
              label="Metode Bayar"
              id="payment_method_ops"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'TRANSFER' | 'QRIS')}
              options={[
                { value: 'CASH', label: 'Tunai' },
                { value: 'TRANSFER', label: 'Transfer Bank' },
                { value: 'QRIS', label: 'QRIS' },
              ]}
            />
          </div>
          <Input label="Keterangan" id="keterangan_ops" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Deskripsi pengeluaran..." />
          <Input label="Nominal (Rp)" id="nominal_ops" type="number" min="1" value={nominal} onChange={(e) => setNominal(e.target.value)} required placeholder="0" />
        </CardBody>
        <CardFooter>
          <div className="flex justify-end">
            <Button type="submit" loading={isPending} id="submit-operasional">Simpan Pengeluaran</Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
