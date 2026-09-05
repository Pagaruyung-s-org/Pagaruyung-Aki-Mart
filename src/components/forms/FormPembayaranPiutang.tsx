'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { formatRupiah, toInputDate } from '@/lib/utils'
import { createCustomerPayment } from '@/actions/transactions'
import { useToast } from '@/components/ui/Toast'

interface Account {
  id: string
  name: string
  type: string
}

interface Props {
  receivableId: string
  kodePiutang: string
  customerName: string
  sisaPiutang: number
  accounts: Account[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function FormPembayaranPiutang({
  receivableId,
  kodePiutang,
  customerName,
  sisaPiutang,
  accounts,
  onSuccess,
  onCancel,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const defaultKas = accounts.find(a => a.type === 'KAS')?.id || ''

  const [tanggal, setTanggal] = useState(toInputDate())
  const [nominal, setNominal] = useState<number | ''>(sisaPiutang)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH')
  const [accountId, setAccountId] = useState(defaultKas)
  const [keterangan, setKeterangan] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nominalVal = Number(nominal)
    if (!nominalVal || nominalVal <= 0) {
      showToast('error', 'Nominal harus lebih dari 0')
      return
    }
    if (nominalVal > sisaPiutang) {
      showToast('error', `Nominal melebihi sisa piutang (${formatRupiah(sisaPiutang)})`)
      return
    }
    if (!accountId) {
      showToast('error', 'Pilih akun tujuan')
      return
    }

    startTransition(async () => {
      const result = await createCustomerPayment({
        receivable_id: receivableId,
        tanggal,
        nominal: nominalVal,
        payment_method: paymentMethod,
        account_id: accountId,
        keterangan: keterangan || undefined,
      })

      if (!result.success) {
        showToast('error', result.error)
        return
      }

      showToast('success', result.message)
      setTimeout(() => {
        router.refresh()
        onSuccess?.()
      }, 1200)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm">
        <p className="text-orange-700 font-medium">{kodePiutang} — {customerName}</p>
        <p className="text-orange-600 mt-0.5">Sisa piutang: <span className="font-bold">{formatRupiah(sisaPiutang)}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Tanggal Pembayaran"
          id="tanggal-bayar"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          required
        />
        <InputCurrency
          label="Nominal Dibayar"
          id="nominal-bayar"
          min={1}
          value={nominal}
          onChange={(val) => setNominal(val === '' ? '' : Number(val))}
          required
          hint={`Maks: ${formatRupiah(sisaPiutang)}`}
          placeholder="0"
        />
        <Select
          label="Metode Pembayaran"
          id="payment-method-piutang"
          value={paymentMethod}
          onChange={(e) => {
            const val = e.target.value as 'CASH' | 'TRANSFER' | 'QRIS'
            setPaymentMethod(val)
            if (val === 'CASH') {
              setAccountId(accounts.find(a => a.type === 'KAS')?.id || '')
            } else {
              setAccountId(accounts.find(a => a.type === 'BANK')?.id || '')
            }
          }}
          options={[
            { value: 'CASH', label: 'Tunai' },
            { value: 'TRANSFER', label: 'Transfer Bank' },
            { value: 'QRIS', label: 'QRIS' },
          ]}
        />
        <Select
          label="Masuk ke Akun"
          id="account-piutang"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[
            { value: '', label: '-- Pilih Akun --' },
            ...accounts
              .filter(a => paymentMethod === 'CASH' ? a.type === 'KAS' : a.type === 'BANK')
              .map(a => ({ value: a.id, label: a.name })),
          ]}
        />
      </div>

      <Input
        label="Keterangan (opsional)"
        id="keterangan-bayar"
        value={keterangan}
        onChange={(e) => setKeterangan(e.target.value)}
        placeholder="Catatan pembayaran"
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={isPending} className="bg-green-600 hover:bg-green-700">
          Simpan Pembayaran
        </Button>
      </div>
    </form>
  )
}
