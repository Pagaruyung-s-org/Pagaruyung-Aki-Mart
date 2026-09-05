'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Select } from '@/components/ui/Select'
import { createMutasiKas } from '@/actions/closing'

interface Account { id: string; name: string; type: string }

interface Props {
  accounts: Account[]
  role: string          // 'ADMIN' | 'OWNER' | 'SUPER_ADMIN'
  onClose: () => void
  onSuccess?: () => void
}

export function MutasiKasModal({ accounts, role, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const [jenisAksi, setJenisAksi] = useState<'MASUK' | 'KELUAR' | 'PINDAH'>('PINDAH')

  // Build allowed accounts (Admin restricted, Owner/SuperAdmin can access all except KAS)
  const allowedAccounts = accounts.filter(a => a.type !== 'KAS')

  // For PINDAH (Admin: Brankas -> Owner)
  const pindahSourceAccounts = role === 'ADMIN' 
    ? accounts.filter(a => a.type === 'BRANKAS')
    : allowedAccounts

  function getPindahDestAccounts(sId: string) {
    if (role === 'ADMIN') return accounts.filter(a => a.type === 'OWNER')
    return allowedAccounts.filter(a => a.id !== sId)
  }

  const [sumberId, setSumberId] = useState(pindahSourceAccounts[0]?.id ?? '')
  const [tujuanId, setTujuanId] = useState('')
  const [nominal, setNominal] = useState('')
  const [keterangan, setKeterangan] = useState('')

  const destAccounts = getPindahDestAccounts(sumberId)

  useEffect(() => {
    if (jenisAksi === 'PINDAH') {
      setTujuanId(destAccounts[0]?.id ?? '')
    } else if (jenisAksi === 'MASUK') {
      setTujuanId(allowedAccounts[0]?.id ?? '')
    } else if (jenisAksi === 'KELUAR') {
      setSumberId(allowedAccounts[0]?.id ?? '')
    }
  }, [sumberId, jenisAksi])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)
    startTransition(async () => {
      const result = await createMutasiKas({
        jenis_aksi: jenisAksi,
        sumber_id: (jenisAksi === 'PINDAH' || jenisAksi === 'KELUAR') ? sumberId : undefined,
        tujuan_id: (jenisAksi === 'PINDAH' || jenisAksi === 'MASUK') ? tujuanId : undefined,
        nominal: Number(nominal),
        keterangan: keterangan || undefined,
      })
      if (!result.success) {
        setToast({ type: 'error', msg: result.error })
        return
      }
      setToast({ type: 'success', msg: result.message })
      if (onSuccess) setTimeout(onSuccess, 800)
    })
  }

  const sumberLabel = accounts.find(a => a.id === sumberId)?.name ?? '—'
  const tujuanLabel = accounts.find(a => a.id === tujuanId)?.name ?? '—'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Mutasi Kas</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {toast && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {toast.type === 'success'
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {toast.msg}
            </div>
          )}

          {/* Aksi Dropdown (Admin hanya bisa PINDAH) */}
          {role !== 'ADMIN' && (
            <Select
              label="Jenis Mutasi"
              id="jenis_aksi"
              value={jenisAksi}
              onChange={e => setJenisAksi(e.target.value as any)}
              required
              options={[
                { value: 'PINDAH', label: 'Pindah Saldo' },
                { value: 'MASUK', label: 'Uang Masuk' },
                { value: 'KELUAR', label: 'Uang Keluar' },
              ]}
            />
          )}

          {/* Preview Arah Dana */}
          {jenisAksi === 'PINDAH' && (
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 rounded-xl text-sm font-medium text-gray-700">
              <span className="truncate max-w-[140px]">{sumberLabel}</span>
              <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="truncate max-w-[140px]">{tujuanId ? tujuanLabel : '—'}</span>
            </div>
          )}

          {(jenisAksi === 'PINDAH' || jenisAksi === 'KELUAR') && (
            <Select
              label={jenisAksi === 'PINDAH' ? "Dari Akun (Sumber)" : "Akun Sumber"}
              id="pindah_sumber"
              value={sumberId}
              onChange={e => setSumberId(e.target.value)}
              required
              options={(jenisAksi === 'PINDAH' ? pindahSourceAccounts : allowedAccounts).map(a => ({ value: a.id, label: a.name }))}
            />
          )}

          {(jenisAksi === 'PINDAH' || jenisAksi === 'MASUK') && (
            <Select
              label={jenisAksi === 'PINDAH' ? "Ke Akun (Tujuan)" : "Akun Tujuan"}
              id="pindah_tujuan"
              value={tujuanId}
              onChange={e => setTujuanId(e.target.value)}
              required
              options={(jenisAksi === 'PINDAH' ? destAccounts : allowedAccounts).map(a => ({ value: a.id, label: a.name }))}
            />
          )}

          <InputCurrency
            label="Nominal (Rp)"
            id="pindah_nominal"
            min="1"
            value={nominal === '' ? '' : Number(nominal)}
            onChange={val => setNominal(val.toString())}
            required
            placeholder="0"
          />

          <Input
            label="Keterangan (opsional)"
            id="pindah_keterangan"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Contoh: Setoran owner 5 Sept"
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={isPending}
              id="submit-pindah-saldo"
              disabled={
                !nominal ||
                (jenisAksi === 'PINDAH' && (!sumberId || !tujuanId)) ||
                (jenisAksi === 'MASUK' && !tujuanId) ||
                (jenisAksi === 'KELUAR' && !sumberId)
              }
            >
              Simpan Mutasi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
