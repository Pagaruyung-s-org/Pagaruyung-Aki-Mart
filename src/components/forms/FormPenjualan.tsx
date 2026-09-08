'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card'
import { formatRupiah, toInputDate } from '@/lib/utils'
import { createSale } from '@/actions/transactions'
import { useToast } from '@/components/ui/Toast'

interface Product {
  id: string; merk: string; kategori: string; type: string | null
  kode_baterai: string | null; kapasitas_ah: number; kode_produk: string
  harga_jual: number; qty_stok: number; status: boolean
  harga_modal?: number
}

interface SaleItem {
  product_id: string; qty: number; harga_jual: number; discount: number
}

interface Account {
  id: string
  name: string
  type: string
  is_active: boolean
}

interface SplitRow {
  method: 'CASH' | 'TRANSFER' | 'QRIS'
  account_id: string
  amount: number | ''
}

export function FormPenjualan({
  products,
  airAkiProducts = [],
  showAirAkiCheckbox = false,
  onSuccess,
  onCancel,
  role,
  accounts = []
}: {
  products: Product[]
  airAkiProducts?: Product[]
  showAirAkiCheckbox?: boolean
  onSuccess?: (saleData?: { id: string; kode: string; isIndent?: boolean }) => void
  onCancel?: () => void
  role?: string | null
  accounts?: Account[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultKas = accounts?.find(a => a.type === 'KAS')?.id || ''
  const defaultBank = accounts?.find(a => a.type === 'BANK')?.id || ''

  const [tanggal, setTanggal] = useState(toInputDate())
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS' | 'SPLIT'>('CASH')
  const [accountId, setAccountId] = useState(defaultKas)
  const [keterangan, setKeterangan] = useState('')
  const [items, setItems] = useState<SaleItem[]>([{ product_id: '', qty: 1, harga_jual: 0, discount: 0 }])
  const [isIndent, setIsIndent] = useState(false)
  const [dpAmount, setDpAmount] = useState<number | ''>('')

  // Split payment state
  const [splitRows, setSplitRows] = useState<SplitRow[]>([
    { method: 'CASH', account_id: defaultKas, amount: '' },
    { method: 'TRANSFER', account_id: defaultBank, amount: '' },
  ])

  // State khusus Sertakan Air Aki
  const [includeAirAki, setIncludeAirAki] = useState(false)
  const [airAkiProductId, setAirAkiProductId] = useState('')
  const [airAkiQty, setAirAkiQty] = useState(1)
  const [airAkiHarga, setAirAkiHarga] = useState(0)
  const [jualKeTokoPusat, setJualKeTokoPusat] = useState(false)

  const { showToast } = useToast()

  function getProduct(id: string) { return products.find(p => p.id === id) ?? airAkiProducts.find(p => p.id === id) }
  const visibleProducts = isIndent ? products : products.filter(p => p.status === true)

  function updateItem(idx: number, field: keyof SaleItem, value: string | number) {
    const updated = [...items]
    if (field === 'product_id') {
      const p = getProduct(value as string)
      const hargaJual = jualKeTokoPusat ? (p?.harga_modal ?? p?.harga_jual ?? 0) : (p?.harga_jual ?? 0)
      updated[idx] = { ...updated[idx], product_id: value as string, harga_jual: hargaJual }
    } else {
      updated[idx] = { ...updated[idx], [field]: value }
    }
    setItems(updated)
  }

  function handleJualKeTokoPusatChange(checked: boolean) {
    setJualKeTokoPusat(checked)
    if (checked) {
      setItems(items.map(item => {
        const p = getProduct(item.product_id)
        return { ...item, harga_jual: p?.harga_modal ?? p?.harga_jual ?? 0, discount: 0 }
      }))
    } else {
      setItems(items.map(item => {
        const p = getProduct(item.product_id)
        return { ...item, harga_jual: p?.harga_jual ?? 0, discount: 0 }
      }))
    }
  }

  function addItem() { setItems([...items, { product_id: '', qty: 1, harga_jual: 0, discount: 0 }]) }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)) }

  // Split payment helpers
  function updateSplitRow(idx: number, field: keyof SplitRow, value: any) {
    const updated = [...splitRows]
    if (field === 'method') {
      const m = value as 'CASH' | 'TRANSFER' | 'QRIS'
      const defaultAcc = m === 'CASH'
        ? accounts?.find(a => a.type === 'KAS')?.id || ''
        : accounts?.find(a => a.type === 'BANK')?.id || ''
      updated[idx] = { ...updated[idx], method: m, account_id: defaultAcc }
    } else {
      updated[idx] = { ...updated[idx], [field]: value }
    }
    setSplitRows(updated)
  }
  function addSplitRow() { setSplitRows([...splitRows, { method: 'TRANSFER', account_id: defaultBank, amount: '' }]) }
  function removeSplitRow(idx: number) { setSplitRows(splitRows.filter((_, i) => i !== idx)) }

  const subtotalAll = items.reduce((s, i) => s + (i.qty * i.harga_jual) - i.discount, 0)
  const total = subtotalAll
  const totalSplit = splitRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const targetAmount = isIndent ? (Number(dpAmount) || 0) : total

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const item of items) {
      if (item.product_id && item.qty > 0) {
        const p = getProduct(item.product_id)
        if (!isIndent && p && item.qty > p.qty_stok) {
          const pName = p.kategori === 'Air Aki'
            ? p.merk
            : [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' · ')

          showToast('error', `Stok produk ${pName} tidak cukup! Sisa stok: ${p.qty_stok} unit`)
          return
        }
      }
    }

    const validItems = items.filter(i => i.product_id && i.qty > 0)

    if (includeAirAki && airAkiProductId && airAkiQty > 0) {
      const p = airAkiProducts.find(x => x.id === airAkiProductId)
      if (p && airAkiQty > p.qty_stok) {
        showToast('error', `Stok Air Aki ${p.merk} tidak cukup! Sisa stok: ${p.qty_stok} unit`)
        return
      }

      validItems.push({
        product_id: airAkiProductId,
        qty: airAkiQty,
        harga_jual: 0,
        discount: 0
      })
    }

    if (validItems.length === 0) {
      showToast('error', 'Minimal 1 produk harus dipilih')
      return
    }

    // Validasi split payment
    if (paymentMethod === 'SPLIT') {
      const validSplits = splitRows.filter(r => r.account_id && Number(r.amount) > 0)
      if (validSplits.length < 2) {
        showToast('error', 'Split payment harus memiliki minimal 2 metode pembayaran')
        return
      }
      if (totalSplit !== targetAmount) {
        showToast('error', `Total split (${formatRupiah(totalSplit)}) harus sama dengan ${isIndent ? 'DP' : 'total'} (${formatRupiah(targetAmount)})`)
        return
      }
    }

    startTransition(async () => {
      const result = await createSale({
        tanggal,
        customer_name: customerName || undefined,
        payment_method: paymentMethod,
        account_id: paymentMethod === 'SPLIT' ? undefined : accountId,
        split_payments: paymentMethod === 'SPLIT'
          ? splitRows.filter(r => r.account_id && Number(r.amount) > 0).map(r => ({
            method: r.method,
            account_id: r.account_id,
            amount: Number(r.amount),
          }))
          : undefined,
        discount: 0,
        keterangan: keterangan || undefined,
        is_indent: isIndent,
        dp_amount: isIndent ? (Number(dpAmount) || 0) : 0,
        is_toko_pusat: jualKeTokoPusat,
        items: validItems.map(i => ({ product_id: i.product_id, qty: i.qty, harga_jual: i.harga_jual, discount: i.discount })),
      })
      if (!result.success) { showToast('error', result.error); return }
      showToast('success', result.message)
      setTimeout(() => {
        router.refresh()
        if (onSuccess) onSuccess(result.data ? { ...result.data, isIndent } : undefined)
        else router.push('/penjualan')
      }, 1500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Informasi Penjualan</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors border border-orange-200" title="Harga jual = modal HPP">
              <input type="checkbox" className="rounded border-orange-300 text-orange-600 focus:ring-orange-500" checked={jualKeTokoPusat} onChange={(e) => handleJualKeTokoPusatChange(e.target.checked)} />
              <span>Jual ke Toko Pusat</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
              <input type="checkbox" className="rounded border-blue-300 text-blue-600 focus:ring-blue-500" checked={isIndent} onChange={(e) => setIsIndent(e.target.checked)} />
              Simpan Sebagai Inden
            </label>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Tanggal Penjualan"
            id="tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
          <Input label="Nama Customer (opsional)" id="customer_name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama customer jika perlu dicatat" />
          {!jualKeTokoPusat && (
            <Select label="Metode Pembayaran" id="payment_method" value={paymentMethod} onChange={(e) => {
              const val = e.target.value as 'CASH' | 'TRANSFER' | 'QRIS' | 'SPLIT';
              setPaymentMethod(val);
              if (val === 'CASH') {
                setAccountId(accounts?.find(a => a.type === 'KAS')?.id || '');
              } else if (val !== 'SPLIT') {
                setAccountId(accounts?.find(a => a.type === 'BANK')?.id || '');
              }
            }} options={[
              { value: 'CASH', label: 'Tunai' },
              { value: 'TRANSFER', label: 'Transfer Bank' },
              { value: 'QRIS', label: 'QRIS' },
              { value: 'SPLIT', label: 'Split Payment' },
            ]} />
          )}
          {!jualKeTokoPusat && paymentMethod !== 'SPLIT' && (
            <Select
              label="Simpan Ke Akun"
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
          )}
          {jualKeTokoPusat && (
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
              <span className="font-semibold">⚠ Piutang:</span>
              Transaksi ini dicatat sebagai piutang. Kas masuk saat dilunaskan di halaman Piutang.
            </div>
          )}
          {isIndent && (
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
              <InputCurrency label="Nominal DP (Opsional, ketik 0 jika tanpa DP)" id="dp_amount" min="0" value={dpAmount} onChange={(val) => setDpAmount(val === '' ? '' : Number(val))} placeholder="0" required={isIndent} />
            </div>
          )}
        </CardBody>
      </Card>


      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Detail Produk</h2>
          <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Tambah Produk</Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {items.map((item, idx) => {
            const product = getProduct(item.product_id)
            const subtotal = (item.qty * item.harga_jual) - item.discount
            return (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500">Item {idx + 1}</span>
                  {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <Select
                      label="Produk"
                      id={`product-${idx}`}
                      value={item.product_id}
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      required
                      placeholder="-- Pilih Produk --"
                      options={visibleProducts.map(p => ({
                        value: p.id,
                        label: p.kategori === 'Air Aki'
                          ? p.merk
                          : [p.merk, p.type, p.kategori, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' · ')
                      }))}
                    />
                  </div>
                  <Input label="QTY" id={`qty-${idx}`} type="number" min="1" value={item.qty || ''} onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} required hint={product && !isIndent ? `Stok: ${product.qty_stok} unit${role === 'SUPER_ADMIN' && product.harga_modal ? ` | Modal: ${formatRupiah(product.harga_modal)}` : ''}` : undefined} placeholder="0" />
                  <InputCurrency label="Harga Jual" id={`harga-${idx}`} min="0" value={item.harga_jual || ''} onChange={(val) => updateItem(idx, 'harga_jual', val === '' ? 0 : Number(val))} required disabled={!isIndent && !jualKeTokoPusat} />

                  <InputCurrency
                    label="Bayar"
                    id={`bayar-${idx}`}
                    min="0"
                    value={subtotal === 0 ? '' : subtotal}
                    onChange={(val) => updateItem(idx, 'discount', (item.qty * item.harga_jual) - (val === '' ? 0 : Number(val)))}
                    required
                    hint={item.discount > 0 ? `Diskon: ${formatRupiah(item.discount)}` : undefined}
                    placeholder="0"
                  />
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      {showAirAkiCheckbox && airAkiProducts.length > 0 && (
        <Card>
          <CardBody className="py-4">
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  checked={includeAirAki}
                  onChange={(e) => {
                    setIncludeAirAki(e.target.checked)
                    if (e.target.checked && airAkiProducts.length > 0 && !airAkiProductId) {
                      setAirAkiProductId(airAkiProducts[0].id)
                      setAirAkiHarga(airAkiProducts[0].harga_jual)
                    }
                  }}
                />
                Sertakan Air Aki
              </label>

              {includeAirAki && (
                <div className="pl-6 grid grid-cols-4 gap-4 items-start">
                  <div className="col-span-2">
                    <Select
                      label="Pilih Air Aki"
                      id="air-aki-select"
                      value={airAkiProductId}
                      onChange={(e) => {
                        setAirAkiProductId(e.target.value)
                        const p = airAkiProducts.find(x => x.id === e.target.value)
                        if (p) setAirAkiHarga(p.harga_jual)
                      }}
                      options={airAkiProducts.map(p => ({
                        value: p.id,
                        label: p.merk
                      }))}
                    />
                  </div>
                  <Input
                    label="QTY"
                    id="air-aki-qty"
                    type="number"
                    min="1"
                    value={airAkiQty || ''}
                    onChange={(e) => setAirAkiQty(Number(e.target.value))}
                    placeholder="0"
                    hint={airAkiProductId ? `Stok: ${airAkiProducts.find(x => x.id === airAkiProductId)?.qty_stok ?? 0} unit` : undefined}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Subtotal Air Aki</label>
                    <div className="flex items-center h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-500">
                      Termasuk paket (Rp0)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Split Payment Detail */}
      {paymentMethod === 'SPLIT' && !jualKeTokoPusat && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Detail Pembayaran Split</h2>
            <Button type="button" size="sm" variant="outline" onClick={addSplitRow}><Plus className="h-3.5 w-3.5" /> Tambah Metode</Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {splitRows.map((row, idx) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-xl border border-purple-200 grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3">
                  <Select
                    label="Metode"
                    id={`split-method-${idx}`}
                    value={row.method}
                    onChange={(e) => updateSplitRow(idx, 'method', e.target.value)}
                    options={[
                      { value: 'CASH', label: 'Tunai' },
                      { value: 'TRANSFER', label: 'Transfer' },
                      { value: 'QRIS', label: 'QRIS' },
                    ]}
                  />
                </div>
                <div className="col-span-4">
                  <Select
                    label="Akun"
                    id={`split-account-${idx}`}
                    value={row.account_id}
                    onChange={(e) => updateSplitRow(idx, 'account_id', e.target.value)}
                    options={[
                      { value: '', label: '-- Pilih Akun --' },
                      ...(accounts || [])
                        .filter(a => row.method === 'CASH' ? a.type === 'KAS' : a.type === 'BANK')
                        .map(a => ({ value: a.id, label: a.name }))
                    ]}
                  />
                </div>
                <div className="col-span-4">
                  <InputCurrency
                    label="Nominal"
                    id={`split-amount-${idx}`}
                    min="0"
                    value={row.amount}
                    onChange={(val) => updateSplitRow(idx, 'amount', val === '' ? '' : Number(val))}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-1">
                  {splitRows.length > 2 && (
                    <button type="button" onClick={() => removeSplitRow(idx)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium ${totalSplit === targetAmount ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <span>Total Split: {formatRupiah(totalSplit)}</span>
              <span>{isIndent ? 'Target DP' : 'Target Total'}: {formatRupiah(targetAmount)}</span>
              {totalSplit === targetAmount ? <span>✓ Sesuai</span> : <span>✗ Selisih {formatRupiah(Math.abs(targetAmount - totalSplit))}</span>}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Input label="Keterangan" id="keterangan_jual" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="w-full" placeholder="Catatan opsional" />
          <div className="flex items-end justify-end gap-8">
            <div className="text-right bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <p className="text-sm text-green-600 font-medium flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" /> Total Bayar</p>
              <p className="text-2xl font-bold text-green-700">{formatRupiah(total)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="secondary" onClick={() => onCancel ? onCancel() : router.back()}>Batal</Button>
            <Button type="submit" loading={isPending} id="submit-penjualan" className="bg-green-600 hover:bg-green-700">Simpan Penjualan</Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
