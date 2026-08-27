'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { createManualHutang } from '@/actions/transactions'
import { toInputDate } from '@/lib/utils'

interface Supplier {
  id: string
  nama_supplier: string
}

export function HutangManualModal({ suppliers }: { suppliers: Supplier[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  const router = useRouter()

  const [tanggal, setTanggal] = useState(toInputDate())
  const [supplierId, setSupplierId] = useState('')
  const [nominal, setNominal] = useState<number | ''>('')
  const [keterangan, setKeterangan] = useState('Hutang Lama (Input Manual)')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || !nominal) {
      showToast('error', 'Lengkapi form terlebih dahulu')
      return
    }

    startTransition(async () => {
      const result = await createManualHutang({
        tanggal,
        supplier_id: supplierId,
        nominal: Number(nominal),
        keterangan,
      })

      if (result.success) {
        showToast('success', result.message)
        setIsOpen(false)
        router.refresh()
        // Reset form
        setTanggal(toInputDate())
        setSupplierId('')
        setNominal('')
        setKeterangan('Hutang Lama (Input Manual)')
      } else {
        showToast('error', result.error)
      }
    })
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
        + Input Hutang Manual
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Input Hutang Manual">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
            Fitur ini digunakan untuk mencatat <b>hutang lama</b> atau hutang yang barangnya sudah ada di stok, tanpa perlu membuat transaksi pembelian stok baru.
          </p>

          <Input
            label="Tanggal"
            id="tanggal_hutang"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />

          <Select
            label="Supplier"
            id="supplier_hutang"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={suppliers.map(s => ({ value: s.id, label: s.nama_supplier }))}
            required
          />

          <InputCurrency
            label="Nominal Hutang"
            id="nominal_hutang"
            value={nominal}
            onChange={(val) => setNominal(val === '' ? '' : Number(val))}
            required
            placeholder="0"
          />

          <Input
            label="Keterangan"
            id="keterangan_hutang"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Sisa hutang bulan lalu"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" loading={isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
              Simpan Hutang
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
