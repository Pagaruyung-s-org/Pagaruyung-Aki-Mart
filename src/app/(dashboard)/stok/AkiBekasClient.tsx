'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowDown, ArrowUp, Wallet, Package, ArrowLeftRight } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatRupiah, formatDate } from '@/lib/utils'
import { FormAkiBekasIn } from '@/components/forms/FormAkiBekasIn'
import { FormAkiBekasOut } from '@/components/forms/FormAkiBekasOut'
import { StatusBadge } from '@/components/ui/Badge'
import { XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { voidAkiBekasPurchase, voidAkiBekasSale } from '@/actions/aki-bekas'

export function AkiBekasClient({
  initialBalance,
  categories,
  summary,
  purchases,
  sales,
  bankTransactions,
  role
}: {
  initialBalance: number
  categories: any[]
  summary: any[]
  purchases: any[]
  sales: any[]
  bankTransactions: any[]
  role?: string
}) {
  const [activeTab, setActiveTab] = useState<'STOK' | 'BELI' | 'JUAL' | 'BANK'>('STOK')
  const router = useRouter()
  const [isModalInOpen, setIsModalInOpen] = useState(false)
  const [isModalOutOpen, setIsModalOutOpen] = useState(false)
  const [selectedVoid, setSelectedVoid] = useState<{ id: string, type: 'BELI' | 'JUAL' } | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isVoiding, setIsVoiding] = useState(false)
  const { showToast } = useToast()

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      showToast('error', 'Alasan pembatalan wajib diisi')
      return
    }
    if (!selectedVoid) return

    setIsVoiding(true)
    try {
      let res
      if (selectedVoid.type === 'BELI') {
        res = await voidAkiBekasPurchase(selectedVoid.id, voidReason)
      } else {
        res = await voidAkiBekasSale(selectedVoid.id, voidReason)
      }

      if (res.success) {
        showToast('success', res.message || 'Pembatalan berhasil')
        setSelectedVoid(null)
        setVoidReason('')
        router.refresh()
      } else {
        showToast('error', res.error || 'Terjadi kesalahan')
      }
    } catch (e: any) {
      showToast('error', e.message)
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-800 text-white shadow-md border border-blue-900">
          <CardBody className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-medium mb-1">Saldo Bank Aki Bekas</p>
                <h3 className="text-3xl font-bold">{formatRupiah(initialBalance)}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 font-medium mb-1">Total Stok Tersedia</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {summary.reduce((acc, curr) => acc + curr.qty, 0)} <span className="text-lg text-gray-500 font-normal">Unit</span>
                </h3>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {[
            { id: 'STOK', label: 'Stok', icon: <Package className="w-4 h-4" /> },
            { id: 'BELI', label: 'Masuk', icon: <ArrowDown className="w-4 h-4" /> },
            { id: 'JUAL', label: 'Keluar', icon: <ArrowUp className="w-4 h-4" /> },
            { id: 'BANK', label: 'Mutasi Bank', icon: <ArrowLeftRight className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsModalInOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowDown className="w-4 h-4 mr-2" />
            Catat Masuk (Beli)
          </Button>
          <Button onClick={() => setIsModalOutOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <ArrowUp className="w-4 h-4 mr-2" />
            Catat Keluar (Jual)
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardBody className="p-0">

          {/* TAB: STOK */}
          {activeTab === 'STOK' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4">Kapasitas (AH)</th>
                    <th className="px-6 py-4">Qty Tersedia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada stok aki bekas tersedia
                      </td>
                    </tr>
                  ) : (
                    summary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.kapasitas_ah} AH</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {item.qty} Unit
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: BELI */}
          {activeTab === 'BELI' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4">Tanggal & Kode</th>
                    <th className="px-6 py-4">Kapasitas & Qty</th>
                    <th className="px-6 py-4">Total Harga</th>
                    <th className="px-6 py-4">Sumber</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Belum ada riwayat masuk
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-gray-50 ${p.status === 'VOID' ? 'bg-red-50/30 opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => p.status !== 'VOID' && setSelectedVoid({ id: p.id, type: 'BELI' })}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{p.kode}</div>
                          <div className="text-gray-500">{formatDate(p.tanggal)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{p.kapasitas_ah} AH</div>
                          <div className="text-gray-500">{p.qty} Unit @ {formatRupiah(p.harga_beli_unit)}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-red-600">
                          {formatRupiah(p.total)}
                        </td>
                        <td className="px-6 py-4">
                          {p.sumber === 'TUKAR_TAMBAH' ? (
                            <span className="text-blue-600">Tukar Tambah {p.sales?.kode_penjualan && `(${p.sales.kode_penjualan})`}</span>
                          ) : (
                            <span className="text-gray-600">Beli Langsung</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                          {p.keterangan || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={p.status || 'POSTED'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: JUAL */}
          {activeTab === 'JUAL' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4">Tanggal & Kode</th>
                    <th className="px-6 py-4">Kapasitas & Qty</th>
                    <th className="px-6 py-4">Total Harga</th>
                    {role !== 'ADMIN' && <th className="px-6 py-4">Laba</th>}
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Belum ada riwayat keluar
                      </td>
                    </tr>
                  ) : (
                    sales.map((s) => (
                      <tr 
                        key={s.id} 
                        className={`hover:bg-gray-50 ${s.status === 'VOID' ? 'bg-red-50/30 opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => s.status !== 'VOID' && setSelectedVoid({ id: s.id, type: 'JUAL' })}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{s.kode}</div>
                          <div className="text-gray-500">{formatDate(s.tanggal)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{s.kapasitas_ah} AH</div>
                          <div className="text-gray-500">{s.qty} Unit @ {formatRupiah(s.harga_jual_unit)}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-green-600">
                          {formatRupiah(s.total)}
                        </td>
                        {role !== 'ADMIN' && (
                          <td className="px-6 py-4 font-medium text-blue-600">
                            {formatRupiah(s.laba)}
                          </td>
                        )}
                        <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">
                          {s.keterangan || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={s.status || 'POSTED'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: BANK */}
          {activeTab === 'BANK' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4">Waktu</th>
                    <th className="px-6 py-4">Jenis</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bankTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Belum ada mutasi bank
                      </td>
                    </tr>
                  ) : (
                    bankTransactions.map((bt) => (
                      <tr key={bt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(bt.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          {bt.keterangan?.includes('Pembatalan') ? (
                            <StatusBadge status="VOID" />
                          ) : (
                            <StatusBadge status={bt.jenis} />
                          )}
                        </td>
                        <td className={`px-6 py-4 font-medium ${bt.jenis === 'MASUK' ? 'text-green-600' : 'text-red-600'}`}>
                          {bt.jenis === 'MASUK' ? '+' : '-'}{formatRupiah(bt.nominal)}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {bt.keterangan || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </CardBody>
      </Card>

      <Modal
        isOpen={isModalInOpen}
        onClose={() => setIsModalInOpen(false)}
        title="Catat Aki Bekas Masuk (Pembelian)"
        size="md"
      >
        <FormAkiBekasIn
          categories={categories}
          onSuccess={() => setIsModalInOpen(false)}
          onCancel={() => setIsModalInOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isModalOutOpen}
        onClose={() => setIsModalOutOpen(false)}
        title="Catat Aki Bekas Keluar (Penjualan)"
        size="md"
      >
        <FormAkiBekasOut
          categories={categories}
          summary={summary}
          onSuccess={() => setIsModalOutOpen(false)}
          onCancel={() => setIsModalOutOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedVoid}
        onClose={() => {
          setSelectedVoid(null)
          setVoidReason('')
        }}
        title={`Konfirmasi Void ${selectedVoid?.type === 'BELI' ? 'Pembelian' : 'Penjualan'} Aki Bekas`}
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg text-red-800 text-sm">
            <p className="font-semibold mb-1">Perhatian!</p>
            <p>Tindakan ini akan membatalkan transaksi, {selectedVoid?.type === 'BELI' ? 'menghapus stok yang masuk,' : 'mengembalikan stok yang keluar,'} dan membalikkan mutasi pada kas bank aki bekas secara otomatis.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 outline-none text-base text-gray-900 min-h-[120px]"
              placeholder="Masukkan alasan mengapa transaksi ini dibatalkan..."
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setSelectedVoid(null); setVoidReason('') }} disabled={isVoiding}>
              Tutup
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleVoid}
              loading={isVoiding}
              disabled={!voidReason.trim()}
            >
              Konfirmasi Void
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
