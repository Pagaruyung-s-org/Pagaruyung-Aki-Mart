'use client'

import { useState, useTransition } from 'react'
import { Search, CreditCard, X, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { createSupplierPayment } from '@/actions/transactions'
import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'

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
}

export function HutangTable({ data }: HutangTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selectedHutang, setSelectedHutang] = useState<HutangItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [nominalBayar, setNominalBayar] = useState<number | ''>('')

  // Filter
  const filteredData = data.filter(item => 
    item.kode_pembelian.toLowerCase().includes(search.toLowerCase()) ||
    item.supplier_name.toLowerCase().includes(search.toLowerCase())
  )

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalItems,
    goToNextPage,
    goToPrevPage
  } = usePagination(filteredData, 10)

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
      keterangan: formData.get('keterangan') as string,
    }

    setToastMsg(null)

    if (payload.nominal > selectedHutang.sisa_hutang) {
      setToastMsg({ type: 'error', msg: 'Nominal tidak boleh melebihi sisa hutang!' })
      setIsSubmitting(false)
      return
    }

    try {
      const res = await createSupplierPayment(payload)
      if (res.success) {
        setToastMsg({ type: 'success', msg: res.message })
        setTimeout(() => {
          setSelectedHutang(null)
          router.refresh()
        }, 1500)
      } else {
        setToastMsg({ type: 'error', msg: res.error })
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', msg: err.message || 'Terjadi kesalahan' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari faktur atau supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold">TANGGAL / KODE</th>
              <th className="px-6 py-4 font-semibold">SUPPLIER</th>
              <th className="px-6 py-4 font-semibold text-right">TOTAL TAGIHAN</th>
              <th className="px-6 py-4 font-semibold text-right">SISA HUTANG</th>
              <th className="px-6 py-4 font-semibold text-center">STATUS</th>
              <th className="px-6 py-4 font-semibold text-right">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Tidak ada hutang yang ditemukan.
                </td>
              </tr>
            ) : (
              currentData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{formatDate(item.tanggal)}</div>
                    <div className="text-xs text-gray-500">{item.kode_pembelian}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.supplier_name}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{formatRupiah(item.total)}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    {formatRupiah(item.sisa_hutang)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      item.status_pembayaran === 'HUTANG' 
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {item.status_pembayaran}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => setSelectedHutang(item)}
                      className="gap-1.5"
                    >
                      <CreditCard className="h-4 w-4" />
                      Bayar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        setPageSize={setPageSize}
        goToNextPage={goToNextPage}
        goToPrevPage={goToPrevPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Modal Bayar */}
      {selectedHutang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">Bayar Hutang</h3>
              <button 
                onClick={() => setSelectedHutang(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleBayar} className="p-5 overflow-y-auto">
              {toastMsg && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-4 ${
                  toastMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {toastMsg.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {toastMsg.msg}
                </div>
              )}

              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="text-sm text-red-800 mb-1">Total Sisa Hutang:</div>
                <div className="text-2xl font-bold text-red-900">
                  {formatRupiah(selectedHutang.sisa_hutang)}
                </div>
                <div className="text-xs text-red-700 mt-2">
                  Faktur: {selectedHutang.kode_pembelian} ({selectedHutang.supplier_name})
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Tanggal Pembayaran"
                  type="date"
                  name="tanggal"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
                
                <InputCurrency
                  label="Nominal Dibayar (Rp)"
                  id="nominal"
                  min="1"
                  value={nominalBayar}
                  onChange={(val) => setNominalBayar(val)}
                  required
                />

                <Select
                  label="Metode Pembayaran"
                  name="payment_method"
                  required
                  options={[
                    { value: 'CASH', label: 'Tunai (Kas)' },
                    { value: 'TRANSFER', label: 'Transfer Bank' },
                    { value: 'QRIS', label: 'QRIS' },
                  ]}
                />

                <Input
                  label="Keterangan (opsional)"
                  name="keterangan"
                  placeholder="Misal: Cicilan pertama..."
                />
              </div>

              <div className="mt-6 flex gap-3 pt-5 border-t border-gray-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedHutang(null)}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Memproses...' : 'Proses Pembayaran'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
