'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { useToast } from '@/components/ui/Toast'
import { createAkiBekasSale } from '@/actions/aki-bekas'
import { toInputDate } from '@/lib/utils'

export function FormAkiBekasOut({
  summary,
  categories,
  onSuccess,
  onCancel
}: {
  summary: any[]
  categories: any[]
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  const [tanggal, setTanggal] = useState(toInputDate())
  const [kapasitasAh, setKapasitasAh] = useState('')
  const [qty, setQty] = useState(1)
  const [hargaJual, setHargaJual] = useState(0)
  const [keterangan, setKeterangan] = useState('')

  const handleKapasitasChange = (val: string) => {
    setKapasitasAh(val)
    const cat = categories.find(c => String(c.kapasitas_ah) === val)
    if (cat) {
      setHargaJual(Number(cat.harga_jual))
    } else {
      setHargaJual(0)
    }
  }

  // Cari max qty yang tersedia untuk kapasitas ini
  const maxQty = summary.find(s => String(s.kapasitas_ah) === kapasitasAh)?.qty || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!kapasitasAh) return showToast('error', 'Kapasitas AH harus dipilih')
    if (qty <= 0) return showToast('error', 'Qty harus lebih dari 0')
    if (qty > maxQty) return showToast('error', `Qty melebihi stok (Maks: ${maxQty})`)
    if (hargaJual <= 0) return showToast('error', 'Harga jual harus lebih dari 0')

    startTransition(async () => {
      const res = await createAkiBekasSale({
        tanggal,
        kapasitas_ah: Number(kapasitasAh),
        qty,
        harga_jual_unit: hargaJual,
        keterangan
      })

      if (res.success) {
        showToast('success', res.message || 'Berhasil menyimpan penjualan')
        onSuccess?.()
      } else {
        showToast('error', res.error || 'Gagal menyimpan penjualan')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="text-sm font-medium text-gray-700">Kapasitas (AH)</label>
        <Select
          value={kapasitasAh}
          onChange={(e) => handleKapasitasChange(e.target.value)}
          options={[
            { label: 'Pilih Kapasitas AH', value: '' },
            ...summary.map(s => ({
              label: `${s.kapasitas_ah} AH (Stok: ${s.qty})`,
              value: String(s.kapasitas_ah)
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
            disabled={!kapasitasAh}
          />
          {kapasitasAh && (
            <p className="text-xs text-gray-500 mt-1">Stok Tersedia: {maxQty}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Harga Jual Satuan</label>
          <InputCurrency 
            value={hargaJual || ''}
            onChange={(val) => setHargaJual(Number(val) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Total Harga</label>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-right font-bold text-xl text-green-600">
          Rp {(qty * hargaJual).toLocaleString('id-ID')}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Keterangan (Opsional)</label>
        <Input 
          placeholder="Misal: Dijual ke pengepul"
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
        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" loading={isPending}>
          Simpan Penjualan
        </Button>
      </div>
    </form>
  )
}
