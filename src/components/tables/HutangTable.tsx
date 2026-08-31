'use client'

import { useState, useTransition, useMemo } from 'react'
import { Search, CreditCard, X, Save, AlertCircle, CalendarDays, Wallet } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { createSupplierPayment, createBulkSupplierPayment } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export interface HutangItem {
  id: string
  kode_pembelian: string
  tanggal: string
  supplier_id: string
  supplier_name: string
  total: number
  sudah_dibayar: number
  sisa_hutang: number
  status_pembayaran: string
}

interface HutangTableProps {
  data: HutangItem[]
  role?: string | null
  accounts?: { id: string; name: string; type: string }[]
}

// Group Interface
interface HutangGroup {
  id: string
  supplier_id: string
  supplier_name: string
  billingMonth: Date
  billingMonthName: string
  items: HutangItem[]
  totalHutang: number
  totalSisaHutang: number
}

function getBillingMonth(dateStr: string) {
  const d = new Date(dateStr)
  let m = d.getMonth()
  let y = d.getFullYear()
  if (d.getDate() >= 25) {
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return new Date(y, m, 1)
}

export function HutangTable({ data, role, accounts = [] }: HutangTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  
  // Modals state
  const [selectedHutang, setSelectedHutang] = useState<HutangItem | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<HutangGroup | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()
  
  // Payment Form States
  const [nominalBayar, setNominalBayar] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [accountId, setAccountId] = useState(() => accounts.find(a => a.type === 'KAS')?.id || '')

  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, HutangGroup> = {}
    
    // Filter first
    const filteredData = data.filter(item => 
      item.kode_pembelian.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier_name.toLowerCase().includes(search.toLowerCase())
    )

    filteredData.forEach(item => {
      const bMonth = getBillingMonth(item.tanggal)
      const bMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(bMonth)
      const groupId = `${item.supplier_id}_${bMonth.getTime()}`

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          supplier_id: item.supplier_id,
          supplier_name: item.supplier_name,
          billingMonth: bMonth,
          billingMonthName: bMonthName,
          items: [],
          totalHutang: 0,
          totalSisaHutang: 0,
        }
      }
      groups[groupId].items.push(item)
      groups[groupId].totalHutang += item.total
      groups[groupId].totalSisaHutang += item.sisa_hutang
    })

    // Sort by billing month (desc) then supplier name
    return Object.values(groups).sort((a, b) => {
      if (b.billingMonth.getTime() !== a.billingMonth.getTime()) {
        return b.billingMonth.getTime() - a.billingMonth.getTime()
      }
      return a.supplier_name.localeCompare(b.supplier_name)
    })
  }, [data, search])


  // Handle Single Payment
  async function handleBayar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedHutang) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      supplier_id: selectedHutang.supplier_id,
      purchase_id: selectedHutang.id,
      tanggal: formData.get('tanggal') as string,
      nominal: Number(nominalBayar),
      payment_method: formData.get('payment_method') as any,
      account_id: accountId,
      keterangan: formData.get('keterangan') as string,
    }

    if (payload.nominal > selectedHutang.sisa_hutang) {
      showToast('error', 'Nominal tidak boleh melebihi sisa hutang!')
      setIsSubmitting(false)
      return
    }

    try {
      const res = await createSupplierPayment(payload)
      if (res.success) {
        showToast('success', `Pembayaran ke ${selectedHutang.supplier_name} berhasil!`)
        setSelectedHutang(null)
        router.refresh()
      } else {
        showToast('error', res.error)
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Bulk Payment
  async function handleBayarBulk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedGroup) return

    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    // In bulk mode, we automatically distribute the payment.
    // For simplicity, we just pay the FULL amount of the group since the user is paying the group.
    const inputNominal = Number(nominalBayar)
    if (inputNominal !== selectedGroup.totalSisaHutang) {
       showToast('error', 'Pembayaran massal saat ini harus melunasi seluruh sisa grup!')
       setIsSubmitting(false)
       return
    }

    const payload = {
      supplier_id: selectedGroup.supplier_id,
      purchases: selectedGroup.items.map(i => ({ purchase_id: i.id, nominal: i.sisa_hutang })),
      tanggal: formData.get('tanggal') as string,
      payment_method: formData.get('payment_method') as any,
      account_id: accountId,
      keterangan: formData.get('keterangan') as string,
    }

    try {
      const res = await createBulkSupplierPayment(payload)
      if (res.success) {
        showToast('success', `Pembayaran tagihan ${selectedGroup.billingMonthName} berhasil!`)
        setSelectedGroup(null)
        router.refresh()
      } else {
        showToast('error', res.error)
      }
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search Toolbar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl flex items-center gap-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari faktur atau supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>
      </div>

      {groupedData.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Tidak ada hutang yang ditemukan.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map(group => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Group Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Tagihan {group.supplier_name}</h3>
                    <p className="text-sm text-gray-500">Bulan {group.billingMonthName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Tagihan</p>
                    <p className="text-lg font-bold text-red-600">{formatRupiah(group.totalSisaHutang)}</p>
                  </div>
                  {role !== 'ADMIN' && (
                    <Button
                      onClick={() => {
                        setSelectedGroup(group)
                        setNominalBayar(group.totalSisaHutang)
                        setPaymentMethod('CASH')
                        setAccountId(accounts.find(a => a.type === 'KAS')?.id || '')
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Bayar Tagihan Bulan Ini
                    </Button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
                  <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-medium">KODE PEMBELIAN</th>
                      <th className="px-6 py-3 font-medium">TANGGAL ASLI</th>
                      <th className="px-6 py-3 font-medium text-right">TOTAL FAKTUR</th>
                      <th className="px-6 py-3 font-medium text-right">SISA HUTANG</th>
                      <th className="px-6 py-3 font-medium text-center">STATUS</th>
                      <th className="px-6 py-3 font-medium text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {group.items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <span className="font-mono text-gray-900 font-medium">{item.kode_pembelian}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{formatDate(item.tanggal)}</td>
                        <td className="px-6 py-3 text-right text-gray-700">{formatRupiah(item.total)}</td>
                        <td className="px-6 py-3 text-right font-medium text-red-600">{formatRupiah(item.sisa_hutang)}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            item.status_pembayaran === 'HUTANG' 
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-orange-50 text-orange-700 border border-orange-200'
                          }`}>
                            {item.status_pembayaran}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {role !== 'ADMIN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedHutang(item)
                                setNominalBayar(item.sisa_hutang)
                                setPaymentMethod('CASH')
                                setAccountId(accounts.find(a => a.type === 'KAS')?.id || '')
                              }}
                              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              Bayar Bon
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Bayar (Single) */}
      {selectedHutang && (
        <PaymentModal
          title={`Bayar Bon ${selectedHutang.kode_pembelian}`}
          sisaHutang={selectedHutang.sisa_hutang}
          subtitle={`Supplier: ${selectedHutang.supplier_name}`}
          onClose={() => setSelectedHutang(null)}
          onSubmit={handleBayar}
          nominalBayar={nominalBayar}
          setNominalBayar={setNominalBayar}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          accountId={accountId}
          setAccountId={setAccountId}
          accounts={accounts}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Modal Bayar (Bulk) */}
      {selectedGroup && (
        <PaymentModal
          title={`Bayar Tagihan ${selectedGroup.billingMonthName}`}
          sisaHutang={selectedGroup.totalSisaHutang}
          subtitle={`Supplier: ${selectedGroup.supplier_name} | ${selectedGroup.items.length} Faktur`}
          onClose={() => setSelectedGroup(null)}
          onSubmit={handleBayarBulk}
          nominalBayar={nominalBayar}
          setNominalBayar={setNominalBayar}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          accountId={accountId}
          setAccountId={setAccountId}
          accounts={accounts}
          isSubmitting={isSubmitting}
          lockNominal={true}
        />
      )}
    </div>
  )
}

function PaymentModal({
  title, subtitle, sisaHutang, onClose, onSubmit,
  nominalBayar, setNominalBayar, paymentMethod, setPaymentMethod,
  accountId, setAccountId, accounts, isSubmitting, lockNominal = false
}: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-5 overflow-y-auto">
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="text-sm text-red-800 mb-1">Total Sisa Tagihan:</div>
            <div className="text-2xl font-bold text-red-900">{formatRupiah(sisaHutang)}</div>
            <div className="text-xs text-red-700 mt-2">{subtitle}</div>
          </div>

          <div className="space-y-4">
            <Input
              label="Tanggal Pembayaran"
              type="date"
              name="tanggal"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
            
            <div>
              <InputCurrency
                label="Nominal Dibayar (Rp)"
                id="nominal"
                min="1"
                value={nominalBayar}
                onChange={(val) => setNominalBayar(val)}
                required
                disabled={lockNominal}
              />
              {!lockNominal && Number(nominalBayar) > sisaHutang && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" /> Nominal melebihi sisa hutang! (Maks: {formatRupiah(sisaHutang)})
                </p>
              )}
              {lockNominal && (
                 <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 font-medium">
                 * Pembayaran massal grup tagihan harus sesuai sisa total saat ini.
               </p>
              )}
            </div>

            <Select
              label="Metode Pembayaran"
              name="payment_method"
              required
              value={paymentMethod}
              onChange={(e) => {
                const val = e.target.value
                setPaymentMethod(val)
                if (val === 'CASH') setAccountId(accounts.find((a: any) => a.type === 'KAS')?.id || '')
                else if (val === 'BRANKAS') setAccountId(accounts.find((a: any) => a.type === 'BRANKAS')?.id || '')
                else setAccountId(accounts.find((a: any) => a.type === 'BANK')?.id || '')
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
              id="account_id_hutang"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: '-- Pilih Akun --' },
                ...(accounts || [])
                  .filter((a: any) => paymentMethod === 'CASH' ? a.type === 'KAS' : paymentMethod === 'BRANKAS' ? a.type === 'BRANKAS' : a.type === 'BANK')
                  .map((a: any) => ({ value: a.id, label: a.name }))
              ]}
            />

            <Input
              label="Keterangan (opsional)"
              name="keterangan"
              placeholder="Catatan tambahan..."
            />
          </div>

          <div className="mt-6 flex gap-3 pt-5 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || (!lockNominal && Number(nominalBayar) > sisaHutang)}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Memproses...' : 'Proses Pembayaran'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
