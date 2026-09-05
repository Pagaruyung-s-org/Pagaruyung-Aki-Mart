'use client'

import { useState, useEffect, Fragment } from 'react'
import { Plus, Send, Pencil, Trash2, AlertTriangle, CheckCircle, Clock, ArrowRightLeft, Info, ChevronDown, ChevronRight, Vault } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { StatusBadge } from '@/components/ui/Badge'
import { createClosing, updateClosing, deleteClosing, submitClosing, getClosingSummary, createSetor } from '@/actions/closing'
import type { DailyClosing } from '@/types/database'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDateTime(dateStr: string) {
  return format(new Date(dateStr), "dd/MM/yyyy, HH:mm", { locale: localeId })
}

interface ClosingClientProps {
  closings: DailyClosing[]
  accounts?: { id: string; name: string; type: string; is_active: boolean }[]
  saldoBrankas?: number
}

export function ClosingClient({ closings, accounts = [], saldoBrankas = 0 }: ClosingClientProps) {
  // ==========================================
  // STATE — Form Closing
  // ==========================================
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingClosing, setEditingClosing] = useState<DailyClosing | null>(null)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [totalCashDrop, setTotalCashDrop] = useState('')
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLate, setIsLate] = useState(false)

  // Summary state
  const [summary, setSummary] = useState<{
    total_penjualan_tunai: number
    total_penjualan_transfer: number
    transfer_details?: Record<string, number>
    total_pengeluaran_tunai: number
    total_bayar_hutang: number
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // ==========================================
  // STATE — Submit Confirmation
  // ==========================================
  const [submitConfirmId, setSubmitConfirmId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // ==========================================
  // STATE — Delete Confirmation
  // ==========================================
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ==========================================
  // STATE — Table Row Expand
  // ==========================================
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // ==========================================
  // STATE — Setor Form
  // ==========================================
  const [isSetorOpen, setIsSetorOpen] = useState(false)
  const [setorTanggal, setSetorTanggal] = useState(new Date().toISOString().split('T')[0])
  const [setorNominal, setSetorNominal] = useState('')
  const [setorKeterangan, setSetorKeterangan] = useState('')
  const [setorAccountId, setSetorAccountId] = useState('')
  const [setorLoading, setSetorLoading] = useState(false)

  useEffect(() => {
    if (accounts.length > 0 && !setorAccountId) {
      setSetorAccountId(accounts[0].id)
    }
  }, [accounts])

  // ==========================================
  // EFFECT — Check if closing date is late
  // ==========================================
  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(tanggal + 'T00:00:00')
    setIsLate(selected < today)
  }, [tanggal])

  // ==========================================
  // EFFECT — Fetch summary when tanggal changes
  // ==========================================
  useEffect(() => {
    if (!isFormOpen) return
    setLoadingSummary(true)
    getClosingSummary(tanggal).then((result) => {
      if (result.success) {
        setSummary(result.data)
      }
      setLoadingSummary(false)
    })
  }, [tanggal, isFormOpen])

  // ==========================================
  // HANDLERS
  // ==========================================
  function openNewForm() {
    setEditingClosing(null)
    setTanggal(new Date().toISOString().split('T')[0])
    setTotalCashDrop('')
    setCatatan('')
    setError('')
    setSummary(null)
    setIsFormOpen(true)
  }

  function openEditForm(closing: DailyClosing) {
    setEditingClosing(closing)
    setTanggal(closing.tanggal)
    setTotalCashDrop(closing.total_cash_drop.toString())
    setCatatan(closing.catatan || '')
    setError('')
    setSummary({
      total_penjualan_tunai: closing.total_penjualan_tunai,
      total_penjualan_transfer: closing.total_penjualan_transfer,
      total_pengeluaran_tunai: closing.total_pengeluaran_tunai,
      total_bayar_hutang: closing.total_bayar_hutang,
    })
    setIsFormOpen(true)
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cashDrop = parseFloat(totalCashDrop) || 0

    if (editingClosing) {
      const result = await updateClosing(editingClosing.id, {
        tanggal,
        total_cash_drop: cashDrop,
        catatan: catatan || undefined,
      })
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }
    } else {
      const result = await createClosing({
        tanggal,
        total_cash_drop: cashDrop,
        catatan: catatan || undefined,
      })
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setIsFormOpen(false)
    window.location.reload()
  }

  async function handleSubmitClosing() {
    if (!submitConfirmId) return
    setSubmitLoading(true)
    const result = await submitClosing(submitConfirmId)
    setSubmitLoading(false)
    setSubmitConfirmId(null)
    if (!result.success) {
      alert(result.error)
    } else {
      window.location.reload()
    }
  }

  async function handleDeleteClosing() {
    if (!deleteConfirmId) return
    setDeleteLoading(true)
    const result = await deleteClosing(deleteConfirmId)
    setDeleteLoading(false)
    setDeleteConfirmId(null)
    if (!result.success) {
      alert(result.error)
    } else {
      window.location.reload()
    }
  }

  async function handleSetor(e: React.FormEvent) {
    e.preventDefault()
    setSetorLoading(true)
    const nominal = parseFloat(setorNominal) || 0
    const result = await createSetor({
      tanggal: setorTanggal,
      nominal,
      keterangan: setorKeterangan || undefined,
      account_id: setorAccountId,
    })
    setSetorLoading(false)
    if (!result.success) {
      alert(result.error)
    } else {
      setIsSetorOpen(false)
      window.location.reload()
    }
  }

  // ==========================================
  // COMPUTED
  // ==========================================
  const cashDrop = parseFloat(totalCashDrop) || 0
  const estimasiSisa = summary
    ? summary.total_penjualan_tunai - summary.total_pengeluaran_tunai - summary.total_bayar_hutang - cashDrop
    : 0

  return (
    <>
      {/* ====== BRANKAS BALANCE CARD ====== */}
      <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Vault className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-700">Saldo Brankas Toko</p>
          <p className="text-2xl font-bold text-emerald-900">{formatRupiah(saldoBrankas)}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Uang tunai yang tersimpan di brankas. Bertambah dari closing harian, berkurang saat setor ke bank.</p>
        </div>
      </div>
      {/* ====== HEADER BUTTONS ====== */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={openNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Closing Harian
        </Button>
        <Button variant="secondary" onClick={() => {
          setSetorTanggal(new Date().toISOString().split('T')[0])
          setSetorNominal('')
          setSetorKeterangan('')
          setIsSetorOpen(true)
        }}>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Setor ke Bank
        </Button>
      </div>

      {/* ====== TABEL RIWAYAT CLOSING ====== */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Riwayat Closing Harian</h3>
        </div>
        {closings.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Belum ada data closing</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Tanggal</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Jual Tunai</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Jual Transfer</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Pengeluaran</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Bayar Hutang</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Cash Drop</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Sisa Laci</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Status</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedRowId(expandedRowId === c.id ? null : c.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {expandedRowId === c.id ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{formatDateTime(c.created_at)}</div>
                            {c.is_late && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                Terlambat
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">{formatRupiah(c.total_penjualan_tunai)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">{formatRupiah(c.total_penjualan_transfer)}</td>
                      <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">{formatRupiah(c.total_pengeluaran_tunai)}</td>
                      <td className="px-4 py-3 text-right text-red-600 whitespace-nowrap">{formatRupiah(c.total_bayar_hutang)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600 whitespace-nowrap">{formatRupiah(c.total_cash_drop)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatRupiah(c.estimasi_sisa_laci)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {c.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Diajukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <Clock className="h-3 w-3" />
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {c.status === 'DRAFT' ? (
                          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSubmitConfirmId(c.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              title="Ajukan Closing"
                            >
                              <Send className="h-3 w-3" />
                              Ajukan
                            </button>
                            <button
                              onClick={() => openEditForm(c)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(c.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Terkunci</span>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/30 border-b border-gray-100">
                      <td colSpan={9} className="p-0 border-0">
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${expandedRowId === c.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                            }`}
                        >
                          <div className="overflow-hidden">
                            <div className="px-6 py-5">
                              <div className="flex flex-col lg:flex-row gap-8 text-sm">
                                <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-50 pb-2">Rangkuman Transaksi</h4>
                                  <div className="space-y-2.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500">Penjualan Tunai</span>
                                      <span className="font-medium text-gray-900">{formatRupiah(c.total_penjualan_tunai)}</span>
                                    </div>
                                    {/* Transfer/QRIS breakdown dari transfer_details */}
                                    {c.transfer_details && Object.keys(c.transfer_details).length > 0 ? (
                                      Object.entries(c.transfer_details as Record<string, number>)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([key, val]) => (
                                          <div key={key} className="flex justify-between items-center pl-2">
                                            <span className="text-gray-400">↳ {key}</span>
                                            <span className="font-medium text-gray-900">{formatRupiah(val)}</span>
                                          </div>
                                        ))
                                    ) : (
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Penjualan Transfer/QRIS</span>
                                        <span className="font-medium text-gray-900">{formatRupiah(c.total_penjualan_transfer)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center text-red-600">
                                      <span>Pengeluaran Operasional</span>
                                      <span className="font-medium">-{formatRupiah(c.total_pengeluaran_tunai)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-600">
                                      <span>Pembayaran Hutang</span>
                                      <span className="font-medium">-{formatRupiah(c.total_bayar_hutang)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 space-y-5 py-2">
                                  <div>
                                    <p className="text-gray-500 font-medium mb-1.5">Catatan</p>
                                    <p className="text-gray-900 whitespace-pre-wrap">{c.catatan || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 font-medium mb-1.5">Waktu Submit</p>
                                    <p className="text-gray-900">{c.submitted_at ? formatDateTime(c.submitted_at) : '-'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== MODAL: FORM CLOSING ====== */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClosing ? 'Edit Closing Harian' : 'Buat Closing Harian'}
        size="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Closing</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!!editingClosing}
            />
          </div>

          {/* Warning Terlambat */}
          {isLate && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Keterlambatan!</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Anda sedang melakukan closing untuk kemarin karena melewati batas jam 12 malam.
                  Pastikan alasan keterlambatan jelas pada catatan.
                </p>
              </div>
            </div>
          )}

          {/* Rangkuman Transaksi */}
          {loadingSummary ? (
            <div className="text-center text-sm text-gray-400 py-4">Menghitung rangkuman...</div>
          ) : summary && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Rangkuman Transaksi</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Penjualan Tunai</div>
                <div className="text-right font-medium text-green-600">{formatRupiah(summary.total_penjualan_tunai)}</div>
                {/* Transfer/QRIS breakdown */}
                {summary.transfer_details && Object.keys(summary.transfer_details).length > 0 ? (
                  Object.entries(summary.transfer_details).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => (
                    <Fragment key={key}>
                      <div className="text-gray-600 pl-2">↳ {key}</div>
                      <div className="text-right font-medium text-blue-600">{formatRupiah(val)}</div>
                    </Fragment>
                  ))
                ) : (
                  <>
                    <div className="text-gray-600">Penjualan Transfer/QRIS</div>
                    <div className="text-right font-medium text-blue-600">{formatRupiah(summary.total_penjualan_transfer)}</div>
                  </>
                )}
                <div className="text-gray-600">Pengeluaran Operasional</div>
                <div className="text-right font-medium text-red-600">-{formatRupiah(summary.total_pengeluaran_tunai)}</div>
                <div className="text-gray-600">Pembayaran Hutang</div>
                <div className="text-right font-medium text-red-600">-{formatRupiah(summary.total_bayar_hutang)}</div>
              </div>
            </div>
          )}

          {/* Nominal Cash Drop */}
          <InputCurrency
            label="Nominal Uang yang Ditarik (100rb & 50rb)"
            id="totalCashDrop"
            value={totalCashDrop === '' ? '' : Number(totalCashDrop)}
            onChange={(val) => setTotalCashDrop(val.toString())}
            placeholder="0"
            min="0"
            required
          />

          {/* Info sisa laci */}
          {summary && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${estimasiSisa < 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <Info className={`h-5 w-5 shrink-0 mt-0.5 ${estimasiSisa < 0 ? 'text-red-500' : 'text-blue-500'}`} />
              <div>
                <p className={`text-sm font-medium ${estimasiSisa < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                  Estimasi Sisa Uang di Laci: {formatRupiah(estimasiSisa)}
                </p>
                <p className={`text-xs mt-0.5 ${estimasiSisa < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                  Pastikan sisa uang fisik di laci (kembalian) adalah sekitar Rp 500.000
                </p>
              </div>
            </div>
          )}

          {/* Catatan */}
          <Input
            label={`Catatan ${isLate ? '*' : ''}`}
            id="catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={isLate ? 'Wajib: Jelaskan alasan keterlambatan...' : 'Opsional: Catatan tambahan...'}
            required={isLate}
            className="w-full"
          />

          {/* Error */}
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : editingClosing ? 'Update Draft' : 'Simpan Draft'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ====== MODAL: KONFIRMASI AJUKAN ====== */}
      <Modal
        isOpen={!!submitConfirmId}
        onClose={() => setSubmitConfirmId(null)}
        title="Konfirmasi Pengajuan Closing"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Peringatan!</p>
              <p className="text-xs text-amber-700 mt-1">
                Setelah diajukan, data closing ini <strong>tidak dapat diedit atau dihapus kembali</strong>.
                Semua transaksi pada tanggal tersebut juga akan <strong>dikunci</strong> (tidak bisa di-VOID).
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Pastikan semua data sudah benar sebelum melanjutkan.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSubmitConfirmId(null)}>
              Batal
            </Button>
            <Button onClick={handleSubmitClosing} disabled={submitLoading}>
              {submitLoading ? 'Mengajukan...' : 'Ya, Ajukan Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ====== MODAL: KONFIRMASI HAPUS ====== */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Hapus Draft Closing"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Apakah Anda yakin ingin menghapus draft closing ini?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDeleteClosing} disabled={deleteLoading}>
              {deleteLoading ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ====== MODAL: FORM SETOR UANG ====== */}
      <Modal
        isOpen={isSetorOpen}
        onClose={() => setIsSetorOpen(false)}
        title="Setor Uang ke Bank"
        size="md"
      >
        <form onSubmit={handleSetor} className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Fitur ini mencatat perpindahan uang dari <strong>Brankas Toko</strong> ke <strong>Rekening Bank</strong>.
              Saldo Brankas akan berkurang dan saldo Bank akan bertambah.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Setor</label>
            <input
              type="date"
              value={setorTanggal}
              onChange={(e) => setSetorTanggal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Rekening Tujuan</label>
            <select
              value={setorAccountId}
              onChange={(e) => setSetorAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="" disabled>-- Pilih Rekening Bank --</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <InputCurrency
            label="Nominal Setoran"
            id="setorNominal"
            value={setorNominal === '' ? '' : Number(setorNominal)}
            onChange={(val) => setSetorNominal(val.toString())}
            placeholder="0"
            min="1"
            required
          />

          <Input
            label="Keterangan"
            id="setorKeterangan"
            value={setorKeterangan}
            onChange={(e) => setSetorKeterangan(e.target.value)}
            placeholder="Contoh: Setor ke BCA..."
            className="w-full"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsSetorOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={setorLoading}>
              {setorLoading ? 'Menyimpan...' : 'Setor'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
