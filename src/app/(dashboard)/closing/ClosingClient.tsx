'use client'

import { useState, useEffect } from 'react'
import { Plus, Send, Pencil, Trash2, AlertTriangle, CheckCircle, Clock, ArrowRightLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { StatusBadge } from '@/components/ui/Badge'
import { createClosing, updateClosing, deleteClosing, submitClosing, getClosingSummary, createSetor } from '@/actions/closing'
import type { DailyClosing } from '@/types/database'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

interface ClosingClientProps {
  closings: DailyClosing[]
}

export function ClosingClient({ closings }: ClosingClientProps) {
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
  // STATE — Setor Form
  // ==========================================
  const [isSetorOpen, setIsSetorOpen] = useState(false)
  const [setorTanggal, setSetorTanggal] = useState(new Date().toISOString().split('T')[0])
  const [setorNominal, setSetorNominal] = useState('')
  const [setorKeterangan, setSetorKeterangan] = useState('')
  const [setorLoading, setSetorLoading] = useState(false)

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
                  <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                  <th className="text-right px-4 py-3 font-medium">Jual Tunai</th>
                  <th className="text-right px-4 py-3 font-medium">Jual Transfer</th>
                  <th className="text-right px-4 py-3 font-medium">Pengeluaran</th>
                  <th className="text-right px-4 py-3 font-medium">Bayar Hutang</th>
                  <th className="text-right px-4 py-3 font-medium">Cash Drop</th>
                  <th className="text-right px-4 py-3 font-medium">Sisa Laci</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{formatDate(c.tanggal)}</div>
                      {c.is_late && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Terlambat
                        </span>
                      )}
                      {c.catatan && (
                        <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{c.catatan}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatRupiah(c.total_penjualan_tunai)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatRupiah(c.total_penjualan_transfer)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatRupiah(c.total_pengeluaran_tunai)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatRupiah(c.total_bayar_hutang)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatRupiah(c.total_cash_drop)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatRupiah(c.estimasi_sisa_laci)}</td>
                    <td className="px-4 py-3 text-center">
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
                    <td className="px-4 py-3 text-center">
                      {c.status === 'DRAFT' ? (
                        <div className="flex items-center justify-center gap-1">
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
                <div className="text-gray-600">Penjualan Transfer/QRIS</div>
                <div className="text-right font-medium text-blue-600">{formatRupiah(summary.total_penjualan_transfer)}</div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan {isLate && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={isLate ? 'Wajib: Jelaskan alasan keterlambatan...' : 'Opsional: Catatan tambahan...'}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              required={isLate}
            />
          </div>

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

          <InputCurrency
            label="Nominal Setoran"
            id="setorNominal"
            value={setorNominal === '' ? '' : Number(setorNominal)}
            onChange={(val) => setSetorNominal(val.toString())}
            placeholder="0"
            min="1"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea
              value={setorKeterangan}
              onChange={(e) => setSetorKeterangan(e.target.value)}
              placeholder="Contoh: Setor ke BCA..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

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
