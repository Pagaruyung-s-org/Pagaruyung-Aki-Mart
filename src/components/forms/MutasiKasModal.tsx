'use client'

import { useState, useTransition } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { toInputDate } from '@/lib/utils'
import { createMutasiKas } from '@/actions/transactions'

interface Account { id: string; name: string; type: string }

export function MutasiKasModal({
  accounts,
  onClose,
  onSuccess,
}: {
  accounts: Account[]
  onClose: () => void
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const defaultKas = accounts.find(a => a.type === 'KAS')?.id ?? ''
  const [tanggal, setTanggal] = useState(toInputDate())
  const [accountId, setAccountId] = useState(defaultKas)
  const [jenis, setJenis] = useState<'MASUK' | 'KELUAR'>('MASUK')
  const [nominal, setNominal] = useState('')
  const [keterangan, setKeterangan] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    startTransition(async () => {
      const result = await createMutasiKas({
        tanggal,
        account_id: accountId,
        jenis,
        nominal: Number(nominal),
        keterangan,
      })
      if (!result.success) {
        setToast({ type: 'error', msg: result.error })
        return
      }
      setToast({ type: 'success', msg: result.message })
      if (onSuccess) setTimeout(onSuccess, 800)
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Tambah Mutasi Kas</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {toast && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {toast.type === 'success'
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {toast.msg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tanggal"
              id="mutasi_tanggal"
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              required
            />
            <Select
              label="Jenis Mutasi"
              id="mutasi_jenis"
              value={jenis}
              onChange={e => setJenis(e.target.value as 'MASUK' | 'KELUAR')}
              options={[
                { value: 'MASUK', label: '⬆ Kas Masuk' },
                { value: 'KELUAR', label: '⬇ Kas Keluar' },
              ]}
            />
          </div>

          <Select
            label="Akun"
            id="mutasi_account"
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            required
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
          />

          <InputCurrency
            label="Nominal (Rp)"
            id="mutasi_nominal"
            min="1"
            value={nominal === '' ? '' : Number(nominal)}
            onChange={val => setNominal(val.toString())}
            required
            placeholder="0"
          />

          <Input
            label="Keterangan"
            id="mutasi_keterangan"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Contoh: Modal kembalian dari sisa kemarin"
            required
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={isPending}
              id="submit-mutasi-kas"
              className={jenis === 'MASUK'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'}
            >
              Simpan Mutasi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
