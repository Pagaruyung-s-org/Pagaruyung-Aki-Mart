'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CreateClosingInput } from '@/types/database'

// ============================================================
// SCHEMA VALIDASI ZOD
// ============================================================

const CreateClosingSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  total_cash_drop: z.number().min(0, 'Nominal tidak boleh negatif'),
  catatan: z.string().optional(),
})

const CreateMutasiKasSchema = z.object({
  jenis_aksi: z.enum(['MASUK', 'KELUAR', 'PINDAH']),
  sumber_id: z.string().optional(),
  tujuan_id: z.string().optional(),
  nominal: z.number().positive('Nominal harus lebih dari 0'),
  keterangan: z.string().optional(),
})

// ============================================================
// ACTION RESULT TYPE
// ============================================================
type ActionResult<T = null> =
  | { success: true; data: T; message: string }
  | { success: false; error: string }

// ============================================================
// HELPER: Hitung rangkuman transaksi per tanggal
// ============================================================
async function getTransactionSummary(supabase: any, tanggal: string) {
  const startOfDay = `${tanggal}T00:00:00+07:00`
  const endOfDay = `${tanggal}T23:59:59+07:00`

  // Penjualan tunai
  const { data: salesCash } = await supabase
    .from('sales')
    .select('total')
    .eq('payment_method', 'CASH')
    .in('status_transaksi', ['PAID'])
    .gte('tanggal', startOfDay)
    .lte('tanggal', endOfDay)

  const totalPenjualanTunai = salesCash?.reduce((sum: number, s: any) => sum + Number(s.total), 0) ?? 0

  // Penjualan transfer/qris — hitung per bank
  const { data: salesTransfer } = await supabase
    .from('sales')
    .select('total, payment_method, keterangan')
    .in('payment_method', ['TRANSFER', 'QRIS'])
    .in('status_transaksi', ['PAID'])
    .gte('tanggal', startOfDay)
    .lte('tanggal', endOfDay)

  // Akumulasi total per bank/QRIS
  const transferDetails: Record<string, number> = {}
  let totalPenjualanTransfer = 0
  for (const s of salesTransfer ?? []) {
    const amount = Number(s.total)
    totalPenjualanTransfer += amount
    let key = 'QRIS'
    if (s.payment_method === 'TRANSFER') {
      // Format keterangan: "Bank: MANDIRI" atau "tukar tambah (Bank: BCA)"
      const match = s.keterangan?.match(/Bank:\s*(\S+)/i)
      key = match ? `Transfer ${match[1].toUpperCase()}` : 'Transfer (Lainnya)'
    }
    transferDetails[key] = (transferDetails[key] ?? 0) + amount
  }

  // Pengeluaran operasional (tunai)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('nominal')
    .eq('payment_method', 'CASH')
    .in('status_transaksi', ['POSTED'])
    .eq('tanggal', tanggal)

  const totalPengeluaranTunai = expenses?.reduce((sum: number, e: any) => sum + Number(e.nominal), 0) ?? 0

  // Pembayaran hutang (tunai)
  const { data: payments } = await supabase
    .from('supplier_payments')
    .select('nominal')
    .eq('payment_method', 'CASH')
    .in('status_transaksi', ['PAID'])
    .eq('tanggal', tanggal)

  const totalBayarHutang = payments?.reduce((sum: number, p: any) => sum + Number(p.nominal), 0) ?? 0

  return {
    total_penjualan_tunai: totalPenjualanTunai,
    total_penjualan_transfer: totalPenjualanTransfer,
    transfer_details: transferDetails,
    total_pengeluaran_tunai: totalPengeluaranTunai,
    total_bayar_hutang: totalBayarHutang,
  }
}

// ============================================================
// SERVER ACTION: AMBIL RANGKUMAN UNTUK CLOSING
// ============================================================
export async function getClosingSummary(tanggal: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Tidak terautentikasi' }

  const summary = await getTransactionSummary(supabase, tanggal)
  return { success: true as const, data: summary }
}

// ============================================================
// SERVER ACTION: BUAT CLOSING DRAFT
// ============================================================
export async function createClosing(input: CreateClosingInput): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateClosingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  // Cek apakah tanggal sudah ada closing
  const { data: existing } = await supabase
    .from('daily_closings')
    .select('id, status')
    .eq('tanggal', data.tanggal)
    .maybeSingle()

  if (existing) {
    return { success: false, error: `Closing untuk tanggal ${data.tanggal} sudah ada (Status: ${existing.status})` }
  }

  // Cek apakah ini closing terlambat (tanggal closing < hari ini)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const closingDate = new Date(data.tanggal + 'T00:00:00')
  const isLate = closingDate < today

  // Hitung rangkuman transaksi
  const summary = await getTransactionSummary(supabase, data.tanggal)

  // Hitung estimasi sisa laci: Penjualan Tunai - Pengeluaran Tunai - Bayar Hutang - Cash Drop
  const estimasiSisaLaci = summary.total_penjualan_tunai - summary.total_pengeluaran_tunai - summary.total_bayar_hutang - data.total_cash_drop

  const { data: closing, error } = await supabase
    .from('daily_closings')
    .insert({
      tanggal: data.tanggal,
      total_penjualan_tunai: summary.total_penjualan_tunai,
      total_penjualan_transfer: summary.total_penjualan_transfer,
      transfer_details: summary.transfer_details,
      total_pengeluaran_tunai: summary.total_pengeluaran_tunai,
      total_bayar_hutang: summary.total_bayar_hutang,
      total_cash_drop: data.total_cash_drop,
      estimasi_sisa_laci: estimasiSisaLaci,
      catatan: data.catatan || null,
      status: 'DRAFT',
      is_late: isLate,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !closing) {
    return { success: false, error: error?.message ?? 'Gagal menyimpan closing' }
  }

  revalidatePath('/closing')
  return {
    success: true,
    data: { id: closing.id },
    message: `Closing untuk ${data.tanggal} berhasil disimpan sebagai draft`,
  }
}

// ============================================================
// SERVER ACTION: UPDATE CLOSING DRAFT
// ============================================================
export async function updateClosing(id: string, input: CreateClosingInput): Promise<ActionResult<null>> {
  const parsed = CreateClosingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Cek status
  const { data: existing } = await supabase
    .from('daily_closings')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return { success: false, error: 'Data closing tidak ditemukan' }
  if (existing.status === 'SUBMITTED') {
    return { success: false, error: 'Closing yang sudah diajukan tidak dapat diedit' }
  }

  const data = parsed.data
  const summary = await getTransactionSummary(supabase, data.tanggal)
  const estimasiSisaLaci = summary.total_penjualan_tunai - summary.total_pengeluaran_tunai - summary.total_bayar_hutang - data.total_cash_drop

  // Cek apakah ini closing terlambat
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const closingDate = new Date(data.tanggal + 'T00:00:00')
  const isLate = closingDate < today

  const { error } = await supabase
    .from('daily_closings')
    .update({
      total_penjualan_tunai: summary.total_penjualan_tunai,
      total_penjualan_transfer: summary.total_penjualan_transfer,
      transfer_details: summary.transfer_details,
      total_pengeluaran_tunai: summary.total_pengeluaran_tunai,
      total_bayar_hutang: summary.total_bayar_hutang,
      total_cash_drop: data.total_cash_drop,
      estimasi_sisa_laci: estimasiSisaLaci,
      catatan: data.catatan || null,
      is_late: isLate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/closing')
  return { success: true, data: null, message: 'Closing berhasil diupdate' }
}

// ============================================================
// SERVER ACTION: HAPUS CLOSING DRAFT
// ============================================================
export async function deleteClosing(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: existing } = await supabase
    .from('daily_closings')
    .select('status')
    .eq('id', id)
    .single()

  if (!existing) return { success: false, error: 'Data closing tidak ditemukan' }
  if (existing.status === 'SUBMITTED') {
    return { success: false, error: 'Closing yang sudah diajukan tidak dapat dihapus' }
  }

  const { error } = await supabase
    .from('daily_closings')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/closing')
  return { success: true, data: null, message: 'Draft closing berhasil dihapus' }
}

// ============================================================
// SERVER ACTION: AJUKAN (SUBMIT) CLOSING
// ============================================================
export async function submitClosing(id: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: closing } = await supabase
    .from('daily_closings')
    .select('*')
    .eq('id', id)
    .single()

  if (!closing) return { success: false, error: 'Data closing tidak ditemukan' }
  if (closing.status === 'SUBMITTED') {
    return { success: false, error: 'Closing ini sudah diajukan sebelumnya' }
  }

  // Update status
  const { error } = await supabase
    .from('daily_closings')
    .update({
      status: 'SUBMITTED',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  // Catat perpindahan uang: KAS keluar (CREDIT) → BRANKAS masuk (DEBIT)
  if (closing.total_cash_drop > 0) {
    const { data: accounts } = await supabase.from('accounts').select('id, type').in('type', ['KAS', 'BRANKAS'])
    const kasId = accounts?.find(a => a.type === 'KAS')?.id
    const brankasId = accounts?.find(a => a.type === 'BRANKAS')?.id

    await supabase.from('cash_transactions').insert([
      {
        tanggal: new Date().toISOString(),
        account_id: kasId,
        account_type: 'KAS',
        transaction_type: 'CREDIT',
        reference_type: 'CASH_DROP',
        reference_id: closing.id,
        debit: 0,
        credit: closing.total_cash_drop,
        description: `Closing harian ${closing.tanggal} — uang ditarik ke brankas`,
      },
      {
        tanggal: new Date().toISOString(),
        account_id: brankasId,
        account_type: 'BRANKAS',
        transaction_type: 'DEBIT',
        reference_type: 'CASH_DROP',
        reference_id: closing.id,
        debit: closing.total_cash_drop,
        credit: 0,
        description: `Closing harian ${closing.tanggal} — kas masuk dari toko`,
      },
    ])
  }

  revalidatePath('/closing')
  revalidatePath('/kas')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: null,
    message: `Closing tanggal ${closing.tanggal} berhasil diajukan. Data transaksi hari tersebut telah dikunci.`,
  }
}

// ============================================================
// SERVER ACTION: CEK APAKAH TANGGAL SUDAH DI-CLOSING
// ============================================================
export async function isDateClosed(tanggal: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('daily_closings')
    .select('status')
    .eq('tanggal', tanggal)
    .eq('status', 'SUBMITTED')
    .maybeSingle()

  return !!data
}

// ============================================================
// SERVER ACTION: MUTASI KAS (MASUK, KELUAR, PINDAH)
// ============================================================
export async function createMutasiKas(
  input: { jenis_aksi: 'MASUK' | 'KELUAR' | 'PINDAH'; sumber_id?: string; tujuan_id?: string; nominal: number; keterangan?: string }
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateMutasiKasSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  const role = roleData?.role as string | undefined

  const data = parsed.data
  const refId = crypto.randomUUID()

  // Validasi role dasar (ADMIN tidak boleh MASUK/KELUAR)
  if (role === 'ADMIN' && data.jenis_aksi !== 'PINDAH') {
    return { success: false, error: 'Admin hanya diizinkan memindahkan saldo (Pindah)' }
  }

  // 1. Aksi PINDAH
  if (data.jenis_aksi === 'PINDAH') {
    if (!data.sumber_id || !data.tujuan_id) return { success: false, error: 'Akun sumber dan tujuan wajib diisi' }
    
    const { data: accountRows } = await supabase.from('accounts').select('id, name, type').in('id', [data.sumber_id, data.tujuan_id])
    const sumber = accountRows?.find(a => a.id === data.sumber_id)
    const tujuan = accountRows?.find(a => a.id === data.tujuan_id)
    if (!sumber || !tujuan) return { success: false, error: 'Akun tidak ditemukan' }

    if (role === 'ADMIN') {
      if (sumber.type !== 'BRANKAS' || tujuan.type !== 'OWNER') {
        return { success: false, error: 'Admin hanya diizinkan memindahkan saldo dari Brankas ke Setoran Owner' }
      }
    }

    const keterangan = data.keterangan || `Pindah saldo: ${sumber.name} → ${tujuan.name}`

    const { error } = await supabase.from('cash_transactions').insert([
      {
        tanggal: new Date().toISOString(),
        account_id: sumber.id,
        account_type: sumber.type,
        transaction_type: 'CREDIT',
        reference_type: 'PINDAH_SALDO',
        reference_id: refId,
        debit: 0,
        credit: data.nominal,
        description: keterangan,
      },
      {
        tanggal: new Date().toISOString(),
        account_id: tujuan.id,
        account_type: tujuan.type,
        transaction_type: 'DEBIT',
        reference_type: 'PINDAH_SALDO',
        reference_id: refId,
        debit: data.nominal,
        credit: 0,
        description: keterangan,
      },
    ])

    if (error) return { success: false, error: error.message }
    revalidatePath('/kas')
    revalidatePath('/closing')
    revalidatePath('/dashboard')
    return { success: true, data: { id: refId }, message: `Pindah saldo Rp ${data.nominal.toLocaleString('id-ID')} berhasil dicatat` }
  }

  // 2. Aksi MASUK
  if (data.jenis_aksi === 'MASUK') {
    if (!data.tujuan_id) return { success: false, error: 'Akun tujuan wajib diisi untuk aksi masuk' }
    
    const { data: tujuan } = await supabase.from('accounts').select('id, name, type').eq('id', data.tujuan_id).single()
    if (!tujuan) return { success: false, error: 'Akun tujuan tidak ditemukan' }

    const keterangan = data.keterangan || `Pemasukan dana: ${tujuan.name}`
    const { error } = await supabase.from('cash_transactions').insert({
      tanggal: new Date().toISOString(),
      account_id: tujuan.id,
      account_type: tujuan.type,
      transaction_type: 'DEBIT',
      reference_type: 'MANUAL',
      reference_id: refId,
      debit: data.nominal,
      credit: 0,
      description: keterangan,
    })

    if (error) return { success: false, error: error.message }
    revalidatePath('/kas')
    revalidatePath('/dashboard')
    return { success: true, data: { id: refId }, message: `Pemasukan uang Rp ${data.nominal.toLocaleString('id-ID')} berhasil dicatat` }
  }

  // 3. Aksi KELUAR
  if (data.jenis_aksi === 'KELUAR') {
    if (!data.sumber_id) return { success: false, error: 'Akun sumber wajib diisi untuk aksi keluar' }
    
    const { data: sumber } = await supabase.from('accounts').select('id, name, type').eq('id', data.sumber_id).single()
    if (!sumber) return { success: false, error: 'Akun sumber tidak ditemukan' }

    const keterangan = data.keterangan || `Pengeluaran dana: ${sumber.name}`
    const { error } = await supabase.from('cash_transactions').insert({
      tanggal: new Date().toISOString(),
      account_id: sumber.id,
      account_type: sumber.type,
      transaction_type: 'CREDIT',
      reference_type: 'MANUAL',
      reference_id: refId,
      debit: 0,
      credit: data.nominal,
      description: keterangan,
    })

    if (error) return { success: false, error: error.message }
    revalidatePath('/kas')
    revalidatePath('/dashboard')
    return { success: true, data: { id: refId }, message: `Pengeluaran uang Rp ${data.nominal.toLocaleString('id-ID')} berhasil dicatat` }
  }

  return { success: false, error: 'Aksi tidak valid' }
}
