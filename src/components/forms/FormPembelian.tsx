'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card'
import { formatRupiah, hitungHargaModalUnit, toInputDate } from '@/lib/utils'
import { createPurchase } from '@/actions/transactions'
import { useToast } from '@/components/ui/Toast'

interface Product {
  id: string; merk: string; kategori: string; type: string | null
  kode_baterai: string | null; kapasitas_ah: number; kode_produk: string; harga_jual: number
}

interface Supplier { id: string; nama_supplier: string; kode_supplier: string }

interface PurchaseItem {
  product_id: string; qty: number; nominal: number
}

export function FormPembelian({ 
  suppliers, 
  products,
  isAirAki = false,
  onSuccess,
  onCancel
}: { 
  suppliers: Supplier[]; 
  products: Product[];
  isAirAki?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [tanggal, setTanggal] = useState(toInputDate())
  const [supplierId, setSupplierId] = useState('')
  const [statusPembayaran, setStatusPembayaran] = useState<'LUNAS' | 'HUTANG'>('HUTANG')
  const [keterangan, setKeterangan] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([{ product_id: '', qty: 0, nominal: 0 }])
  const { showToast } = useToast()

  // Dropdown bertingkat — filter produk berdasarkan pilihan
  const [selectedMerks, setSelectedMerks] = useState<string[]>([''])
  const merks = [...new Set(products.map(p => p.merk))].sort()

  function getKategoriOptions(merk: string) {
    return [...new Set(products.filter(p => p.merk === merk).map(p => p.kategori))].sort()
  }

  function findProduct(idx: number): Product | undefined {
    return products.find(p => p.id === items[idx].product_id)
  }

  function addItem() {
    setItems([...items, { product_id: '', qty: 0, nominal: 0 }])
    setSelectedMerks([...selectedMerks, ''])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
    setSelectedMerks(selectedMerks.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof PurchaseItem, value: string | number) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  const totalNominal = items.reduce((s, i) => s + (i.nominal || 0), 0)
  const pajak = 0 // Pajak ditiadakan
  const total = totalNominal + pajak

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createPurchase({
        tanggal,
        supplier_id: supplierId,
        status_pembayaran: statusPembayaran,
        keterangan,
        items: items.filter(i => i.product_id && i.qty > 0 && i.nominal > 0),
      })

      if (!result.success) {
        showToast('error', result.error)
        return
      }

      showToast('success', result.message)
      setTimeout(() => {
        router.refresh()
        if (onSuccess) onSuccess()
        else router.push('/pembelian')
      }, 1500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Pembelian */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-gray-900">Informasi Pembelian</h2></CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <Input
            label="Tanggal Pembelian"
            id="tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
          <Select
            label="Supplier"
            id="supplier_id"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
            placeholder="-- Pilih Supplier --"
            options={suppliers.map(s => ({ value: s.id, label: s.nama_supplier }))}
          />
          <Select
            label="Status Pembayaran"
            id="status_pembayaran"
            value={statusPembayaran}
            onChange={(e) => setStatusPembayaran(e.target.value as 'LUNAS' | 'HUTANG')}
            options={[
              { value: 'HUTANG', label: 'Hutang' },
              { value: 'LUNAS', label: 'Lunas (Bayar Langsung)' },
            ]}
          />
          <Input
            label="Keterangan (opsional)"
            id="keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Catatan pembelian..."
          />
        </CardBody>
      </Card>

      {/* Detail Item */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Detail Produk</h2>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Tambah Baris
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {items.map((item, idx) => {
            const product = findProduct(idx)
            const modalUnit = item.qty > 0 && item.nominal > 0 ? hitungHargaModalUnit(item.nominal, item.qty) : 0

            return (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown bertingkat produk (atau single dropdown untuk Air Aki) */}
                {isAirAki ? (
                  <div className="grid grid-cols-1">
                    <Select
                      label="Nama Produk"
                      id={`product-${idx}`}
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      required
                      placeholder="-- Pilih Produk Air Aki --"
                      options={products.map(p => ({
                        value: p.id,
                        label: p.merk
                      }))}
                    />
                    {product && (
                      <div className="mt-1 text-xs text-gray-500 flex justify-end">
                        <span>Harga jual saat ini: <strong>{formatRupiah(product.harga_jual)}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Merk"
                      id={`merk-${idx}`}
                      value={selectedMerks[idx] ?? ''}
                      onChange={(e) => {
                        const newMerks = [...selectedMerks]
                        newMerks[idx] = e.target.value
                        setSelectedMerks(newMerks)
                        updateItem(idx, 'product_id', '')
                      }}
                      placeholder="-- Merk --"
                      options={merks.map(m => ({ value: m, label: m }))}
                    />
                    
                    <div>
                      <Select
                        label="Produk (Kode Baterai / AH)"
                        id={`product-${idx}`}
                        value={item.product_id}
                        onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                        required
                        placeholder="-- Pilih Produk --"
                        options={products
                          .filter(p => !selectedMerks[idx] || p.merk === selectedMerks[idx])
                          .map(p => ({
                            value: p.id,
                            label: [p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' · ')
                          }))}
                      />
                      {product && (
                        <div className="mt-1 text-xs text-gray-500 flex justify-end">
                          <span>Harga jual: <strong>{formatRupiah(product.harga_jual)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-3">
                  <Input
                    label="QTY"
                    id={`qty-${idx}`}
                    type="number"
                    min="1"
                    value={item.qty || ''}
                    onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                    required
                    placeholder="0"
                  />
                  <InputCurrency
                    label="Nominal (Rp)"
                    id={`nominal-${idx}`}
                    min="0"
                    value={item.nominal === 0 ? '' : item.nominal}
                    onChange={(val) => updateItem(idx, 'nominal', val === '' ? 0 : Number(val))}
                    required
                    placeholder="Total harga"
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Harga Modal/Unit</label>
                    <div className="flex items-center h-9 px-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700">
                      {formatRupiah(modalUnit)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Subtotal</label>
                    <div className="flex items-center h-9 px-3 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                      {formatRupiah(item.nominal || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardBody>

        {/* Ringkasan Total */}
        <CardFooter>
          <div className="flex items-end justify-end gap-8">
            <div className="text-right space-y-1">
              <p className="text-sm text-gray-500">Total Nominal</p>
              <p className="text-xl font-bold text-gray-900">{formatRupiah(totalNominal)}</p>
            </div>
            <div className="text-right space-y-1 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
              <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Total Bayar
              </p>
              <p className="text-2xl font-bold text-blue-700">{formatRupiah(total)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => onCancel ? onCancel() : router.back()}>Batal</Button>
            <Button type="submit" loading={isPending} id="submit-pembelian">
              Simpan Pembelian
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
