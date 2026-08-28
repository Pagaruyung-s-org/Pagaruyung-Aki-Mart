'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { CreateClosingInput, CreateSetorInput } from '@/types/database'

// ============================================================
// SCHEMA VALIDASI ZOD
// ============================================================

const CreateClosingSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  total_cash_drop: z.number().min(0, 'Nominal tidak boleh negatif'),
  catatan: z.string().optional(),
})

const CreateSetorSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
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
    await supabase.from('cash_transactions').insert([
      {
        tanggal: new Date().toISOString(),
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
        account_type: 'BRANKAS',
        transaction_type: 'DEBIT',
        reference_type: 'CASH_DROP',
        reference_id: closing.id,
        debit: closing.total_cash_drop,
        credit: 0,
        description: `Closing harian ${closing.tanggal} — uang masuk brankas`,
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
// SERVER ACTION: SETOR UANG (BRANKAS → BANK)
// ============================================================
export async function createSetor(input: CreateSetorInput): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateSetorSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Cek role — hanya Owner/Super Admin
  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk menyetor uang' }
  }

  const data = parsed.data

  // Generate ID referensi
  const refId = crypto.randomUUID()

  // Catat perpindahan: BRANKAS keluar → BANK masuk
  const { error } = await supabase.from('cash_transactions').insert([
    {
      tanggal: new Date().toISOString(),
      account_type: 'BRANKAS',
      transaction_type: 'CREDIT',
      reference_type: 'BANK_DEPOSIT',
      reference_id: refId,
      debit: 0,
      credit: data.nominal,
      description: `Setor ke bank — ${data.keterangan || 'Setoran'}`,
    },
    {
      tanggal: new Date().toISOString(),
      account_type: 'BANK',
      transaction_type: 'DEBIT',
      reference_type: 'BANK_DEPOSIT',
      reference_id: refId,
      debit: data.nominal,
      credit: 0,
      description: `Setor dari brankas — ${data.keterangan || 'Setoran'}`,
    },
  ])

  if (error) return { success: false, error: error.message }

  revalidatePath('/kas')
  revalidatePath('/closing')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: refId },
    message: `Setoran Rp ${data.nominal.toLocaleString('id-ID')} berhasil dicatat`,
  }
}
