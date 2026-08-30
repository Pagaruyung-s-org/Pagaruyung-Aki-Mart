'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Calculator, FileImage, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card'
import { formatRupiah, hitungHargaModalUnit, toInputDate } from '@/lib/utils'
import { createPurchase } from '@/actions/transactions'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string; merk: string; kategori: string; type: string | null
  kode_baterai: string | null; kapasitas_ah: number; kode_produk: string; harga_jual: number
}

interface Supplier { id: string; nama_supplier: string; kode_supplier: string }

interface PurchaseItem {
  product_id: string; qty: number; nominal: number
}

interface Account {
  id: string
  name: string
  type: string
  is_active: boolean
}

export function FormPembelian({ 
  suppliers, 
  products,
  isAirAki = false,
  onSuccess,
  onCancel,
  role,
  accounts = []
}: { 
  suppliers: Supplier[]; 
  products: Product[];
  isAirAki?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  role?: string;
  accounts?: Account[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultKas = accounts?.find(a => a.type === 'KAS')?.id || ''

  const [tanggal, setTanggal] = useState(toInputDate())
  const [supplierId, setSupplierId] = useState('')
  const [statusPembayaran, setStatusPembayaran] = useState<'LUNAS' | 'HUTANG'>('HUTANG')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH')
  const [accountId, setAccountId] = useState(defaultKas)
  const [keterangan, setKeterangan] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([{ product_id: '', qty: 0, nominal: 0 }])

  // Faktur fields
  const [namaSales, setNamaSales] = useState('')
  const [nomorFaktur, setNomorFaktur] = useState('')
  const [tanggalFaktur, setTanggalFaktur] = useState('')
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState('')
  const [tanggalSampai, setTanggalSampai] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const item = { ...updated[idx], [field]: value }
    updated[idx] = item
    setItems(updated)
  }

  function handleSupplierChange(newSupplierId: string) {
    setSupplierId(newSupplierId)
  }

  const totalNominal = items.reduce((s, i) => s + (i.nominal || 0), 0)
  const pajak = 0 // Pajak ditiadakan
  const total = totalNominal + pajak

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      // Upload foto faktur jika ada
      let fotoUrl: string | undefined
      if (fotoFile) {
        const supabase = createClient()
        const ext = fotoFile.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('faktur-pembelian')
          .upload(path, fotoFile, { upsert: false })
        if (uploadError) {
          showToast('error', 'Gagal upload foto faktur: ' + uploadError.message)
          return
        }
        const { data: urlData } = supabase.storage.from('faktur-pembelian').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }

      const result = await createPurchase({
        tanggal,
        supplier_id: supplierId,
        status_pembayaran: statusPembayaran,
        payment_method: statusPembayaran === 'LUNAS' ? paymentMethod : undefined,
        account_id: statusPembayaran === 'LUNAS' ? accountId : undefined,
        keterangan,
        nama_sales: namaSales || undefined,
        nomor_faktur: nomorFaktur || undefined,
        tanggal_faktur: tanggalFaktur || undefined,
        tanggal_jatuh_tempo: tanggalJatuhTempo || undefined,
        tanggal_sampai: tanggalSampai || undefined,
        foto_faktur_url: fotoUrl,
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
            onChange={(e) => handleSupplierChange(e.target.value)}
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
          {statusPembayaran === 'LUNAS' && (
            <>
              <Select label="Metode Pembayaran" id="payment_method" value={paymentMethod} onChange={(e) => {
                const val = e.target.value as 'CASH' | 'TRANSFER' | 'QRIS';
                setPaymentMethod(val);
                if (val === 'CASH') {
                  setAccountId(accounts?.find(a => a.type === 'KAS')?.id || '');
                } else {
                  setAccountId(accounts?.find(a => a.type === 'BANK')?.id || '');
                }
              }} options={[{ value: 'CASH', label: 'Tunai' }, { value: 'TRANSFER', label: 'Transfer Bank' }, { value: 'QRIS', label: 'QRIS' }]} />
              <Select
                label="Sumber Dana (Akun)"
                id="account_id"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={[
                  { value: '', label: '-- Pilih Akun --' },
                  ...(accounts || [])
                    .filter(a => paymentMethod === 'CASH' ? a.type === 'KAS' : a.type === 'BANK')
                    .map(a => ({ value: a.id, label: a.name }))
                ]}
              />
            </>
          )}
          <Input
            label="Keterangan (opsional)"
            id="keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Catatan pembelian..."
          />
        </CardBody>
      </Card>

      {/* Informasi Faktur */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-gray-900">Informasi Faktur <span className="text-xs font-normal text-gray-400">(opsional)</span></h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nama Sales"
              id="nama_sales"
              value={namaSales}
              onChange={(e) => setNamaSales(e.target.value)}
              placeholder="Nama sales supplier..."
            />
            <Input
              label="Nomor Faktur"
              id="nomor_faktur"
              value={nomorFaktur}
              onChange={(e) => setNomorFaktur(e.target.value)}
              placeholder="No. faktur dari supplier..."
            />
            <Input
              label="Tanggal Faktur"
              id="tanggal_faktur"
              type="date"
              value={tanggalFaktur}
              onChange={(e) => setTanggalFaktur(e.target.value)}
            />
            <Input
              label="Jatuh Tempo Pembayaran"
              id="tanggal_jatuh_tempo"
              type="date"
              value={tanggalJatuhTempo}
              onChange={(e) => setTanggalJatuhTempo(e.target.value)}
            />
            <Input
              label="Tanggal Sampai Barang"
              id="tanggal_sampai"
              type="date"
              value={tanggalSampai}
              onChange={(e) => setTanggalSampai(e.target.value)}
            />
          </div>

          {/* Upload foto faktur */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Foto Faktur</label>
            {fotoPreview ? (
              <div className="relative inline-block">
                <img src={fotoPreview} alt="Preview faktur" className="h-32 w-auto rounded-lg border border-gray-200 object-cover" />
                <button
                  type="button"
                  onClick={() => { setFotoFile(null); setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="foto_faktur"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <FileImage className="h-6 w-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Klik untuk upload foto faktur</span>
                <span className="text-xs text-gray-400">JPG, PNG, WEBP — maks 5MB</span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="foto_faktur"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) {
                  showToast('error', 'Ukuran foto maksimal 5MB')
                  return
                }
                setFotoFile(file)
                setFotoPreview(URL.createObjectURL(file))
              }}
            />
          </div>
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

                <div className={`grid ${role === 'ADMIN' ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
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
                  {role !== 'ADMIN' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700">Harga Modal/Unit</label>
                      <div className="flex items-center h-9 px-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700">
                        {formatRupiah(modalUnit)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </CardBody>

        {/* Ringkasan Total */}
        <CardFooter>
          <div className="flex items-end justify-end gap-8">
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
