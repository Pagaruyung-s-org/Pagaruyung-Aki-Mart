'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { useToast } from '@/components/ui/Toast'
import { createAkiBekasPurchase } from '@/actions/aki-bekas'
import { toInputDate } from '@/lib/utils'

export function FormAkiBekasIn({
  categories,
  onSuccess,
  onCancel
}: {
  categories: any[]
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const [tanggal, setTanggal] = useState(toInputDate())
  const [kapasitasAh, setKapasitasAh] = useState('')
  const [qty, setQty] = useState(1)
  const [hargaBeli, setHargaBeli] = useState(0)
  const [sumber, setSumber] = useState<'TUKAR_TAMBAH' | 'BELI_LANGSUNG'>('TUKAR_TAMBAH')
  const [keterangan, setKeterangan] = useState('')

  const handleKapasitasChange = (val: string) => {
    setKapasitasAh(val)
    // Harga beli diinput manual
    setHargaBeli(0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!kapasitasAh) return showToast('error', 'Kapasitas AH harus dipilih')
    if (qty <= 0) return showToast('error', 'Qty harus lebih dari 0')
    if (hargaBeli <= 0) return showToast('error', 'Harga beli harus lebih dari 0')

    startTransition(async () => {
      const res = await createAkiBekasPurchase({
        tanggal,
        kapasitas_ah: Number(kapasitasAh),
        qty,
        harga_beli_unit: hargaBeli,
        sumber,
        keterangan
      })

      if (res.success) {
        showToast('success', res.message || 'Berhasil menyimpan pembelian')
        onSuccess?.()
      } else {
        showToast('error', res.error || 'Gagal menyimpan pembelian')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Tanggal</label>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Sumber</label>
          <Select
            value={sumber}
            onChange={(e) => setSumber(e.target.value as any)}
            options={[
              { label: 'Tukar Tambah', value: 'TUKAR_TAMBAH' },
              { label: 'Beli Langsung', value: 'BELI_LANGSUNG' }
            ]}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Kapasitas (AH)</label>
        <Select
          value={kapasitasAh}
          onChange={(e) => handleKapasitasChange(e.target.value)}
          options={[
            { label: 'Pilih Kapasitas AH', value: '' },
            ...categories.map(c => ({
              label: `${c.kapasitas_ah} AH`,
              value: String(c.kapasitas_ah)
            }))
          ]}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Qty (Unit)</label>
          <InputCurrency
            value={qty || ''}
            onChange={(val) => setQty(Number(val) || 0)}
            placeholder="0"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Harga Beli Satuan</label>
          <InputCurrency
            value={hargaBeli || ''}
            onChange={(val) => setHargaBeli(Number(val) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Total Harga</label>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold text-xl text-blue-700">
          Rp {(qty * hargaBeli).toLocaleString('id-ID')}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Keterangan (Opsional)</label>
        <Input
          placeholder="Misal: Tukar tambah dengan PB-XXX"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" className="w-full" loading={isPending}>
          Simpan Pembelian
        </Button>
      </div>
    </form>
  )
}
