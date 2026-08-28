'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = any> = 
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

export async function getBankAkiBalance(): Promise<number> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('bank_aki_bekas_transactions')
    .select('jenis, nominal')

  if (error) {
    console.error('Error fetching bank aki balance:', error.message, error.code, error.details)
    return 0
  }

  return (data || []).reduce((acc, row) => {
    if (row.jenis === 'MASUK') return acc + Number(row.nominal)
    if (row.jenis === 'KELUAR') return acc - Number(row.nominal)
    return acc
  }, 0)
}

export async function addModalAwalBankAki(nominal: number, keterangan: string = 'Modal Awal Bank Aki Bekas'): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('bank_aki_bekas_transactions')
    .insert({
      tanggal: new Date().toISOString().split('T')[0],
      jenis: 'MASUK',
      nominal,
      keterangan,
      reference_type: 'MODAL_AWAL',
      created_by: user.id
    })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/aki-bekas')
  return { success: true, message: 'Modal awal berhasil ditambahkan' }
}

export async function getAkiBekasCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('aki_bekas_categories')
    .select('*')
    .eq('status', true)
    .order('kapasitas_ah')
  
  if (error) throw error
  return data
}

export async function getAkiBekasSummary() {
  const supabase = await createClient()
  
  // Ambil data batch yang tersedia
  const { data: batches, error } = await supabase
    .from('aki_bekas_batches')
    .select('kapasitas_ah, qty_tersedia')
    .gt('qty_tersedia', 0)

  if (error) throw error

  // Hitung total qty per kapasitas
  const summaryMap: Record<number, number> = {}
  batches?.forEach(b => {
    const ah = Number(b.kapasitas_ah)
    const qty = Number(b.qty_tersedia)
    summaryMap[ah] = (summaryMap[ah] || 0) + qty
  })

  // Format array
  const summary = Object.entries(summaryMap).map(([ah, qty]) => ({
    kapasitas_ah: Number(ah),
    qty
  })).sort((a, b) => a.kapasitas_ah - b.kapasitas_ah)

  return summary
}

export async function createAkiBekasPurchase(input: {
  tanggal: string
  kapasitas_ah: number
  qty: number
  harga_beli_unit: number
  sumber: 'TUKAR_TAMBAH' | 'BELI_LANGSUNG'
  sale_id?: string
  keterangan?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const total = input.qty * input.harga_beli_unit

  // 1. Cek saldo bank aki bekas
  const balance = await getBankAkiBalance()
  if (balance < total) {
    return { success: false, error: `Saldo Bank Aki Bekas tidak mencukupi. Saldo saat ini: Rp ${balance.toLocaleString('id-ID')}` }
  }

  // Generate kode (harus dari DB melalui RPC)
  const { data: kode, error: kodeError } = await supabase.rpc('generate_kode_aki_bekas_purchase')
  if (kodeError) return { success: false, error: 'Gagal generate kode: ' + kodeError.message }

  // Transaction
  const { data: purchase, error: purchaseError } = await supabase
    .from('aki_bekas_purchases')
    .insert({
      kode,
      tanggal: input.tanggal,
      kapasitas_ah: input.kapasitas_ah,
      qty: input.qty,
      harga_beli_unit: input.harga_beli_unit,
      sumber: input.sumber,
      sale_id: input.sale_id || null,
      keterangan: input.keterangan || null,
      created_by: user.id
    })
    .select()
    .single()

  if (purchaseError) return { success: false, error: purchaseError.message }

  // Insert to batch
  const { error: batchError } = await supabase
    .from('aki_bekas_batches')
    .insert({
      purchase_id: purchase.id,
      kapasitas_ah: input.kapasitas_ah,
      tanggal_masuk: input.tanggal,
      qty_awal: input.qty,
      qty_tersedia: input.qty,
      harga_beli_unit: input.harga_beli_unit
    })

  if (batchError) {
    return { success: false, error: 'Gagal membuat batch: ' + batchError.message }
  }

  // Catat pengeluaran bank
  const { error: bankError } = await supabase
    .from('bank_aki_bekas_transactions')
    .insert({
      tanggal: input.tanggal,
      jenis: 'KELUAR',
      nominal: total,
      keterangan: `Pembelian aki bekas ${input.kapasitas_ah}AH (${input.qty} unit)`,
      reference_type: 'BELI_BEKAS',
      reference_id: purchase.id,
      created_by: user.id
    })

  if (bankError) return { success: false, error: 'Gagal mencatat mutasi bank: ' + bankError.message }

  revalidatePath('/aki-bekas')
  return { success: true, message: 'Pembelian aki bekas berhasil dicatat' }
}

export async function createAkiBekasSale(input: {
  tanggal: string
  kapasitas_ah: number
  qty: number
  harga_jual_unit: number
  keterangan?: string
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // 1. Cek stok tersedia dan ambil batch FIFO
  const { data: batches, error: batchError } = await supabase
    .from('aki_bekas_batches')
    .select('*')
    .eq('kapasitas_ah', input.kapasitas_ah)
    .gt('qty_tersedia', 0)
    .order('tanggal_masuk', { ascending: true })

  if (batchError) return { success: false, error: batchError.message }

  const totalTersedia = batches.reduce((sum, b) => sum + Number(b.qty_tersedia), 0)
  if (totalTersedia < input.qty) {
    return { success: false, error: `Stok tidak mencukupi. Tersedia: ${totalTersedia}` }
  }

  // 2. Generate kode
  const { data: kode, error: kodeError } = await supabase.rpc('generate_kode_aki_bekas_sale')
  if (kodeError) return { success: false, error: 'Gagal generate kode: ' + kodeError.message }

  // Hitung alokasi FIFO
  let remainingQty = input.qty
  let totalHpp = 0
  const allocations = []
  const updatesToBatches = []

  for (const batch of batches) {
    if (remainingQty <= 0) break

    const qtyAvailable = Number(batch.qty_tersedia)
    const qtyToUse = Math.min(qtyAvailable, remainingQty)
    const subtotalHpp = qtyToUse * Number(batch.harga_beli_unit)

    allocations.push({
      batch_id: batch.id,
      qty_used: qtyToUse,
      harga_beli_unit: batch.harga_beli_unit,
      subtotal_hpp: subtotalHpp
    })
    
    updatesToBatches.push({
      id: batch.id,
      qty_tersedia: qtyAvailable - qtyToUse
    })

    totalHpp += subtotalHpp
    remainingQty -= qtyToUse
  }

  const totalSale = input.qty * input.harga_jual_unit
  const laba = totalSale - totalHpp

  // 3. Insert Sale
  const { data: sale, error: saleError } = await supabase
    .from('aki_bekas_sales')
    .insert({
      kode,
      tanggal: input.tanggal,
      kapasitas_ah: input.kapasitas_ah,
      qty: input.qty,
      harga_jual_unit: input.harga_jual_unit,
      hpp_total: totalHpp,
      laba: laba,
      keterangan: input.keterangan || null,
      created_by: user.id
    })
    .select()
    .single()

  if (saleError) return { success: false, error: saleError.message }

  // 4. Insert Allocations
  const allocData = allocations.map(a => ({
    ...a,
    sale_id: sale.id
  }))
  const { error: allocInsertError } = await supabase
    .from('aki_bekas_sale_allocations')
    .insert(allocData)
  
  if (allocInsertError) return { success: false, error: allocInsertError.message }

  // 5. Update Batches
  for (const update of updatesToBatches) {
    await supabase
      .from('aki_bekas_batches')
      .update({ qty_tersedia: update.qty_tersedia })
      .eq('id', update.id)
  }

  // 6. Insert Bank Masuk
  const { error: bankError } = await supabase
    .from('bank_aki_bekas_transactions')
    .insert({
      tanggal: input.tanggal,
      jenis: 'MASUK',
      nominal: totalSale,
      keterangan: `Penjualan aki bekas ${input.kapasitas_ah}AH (${input.qty} unit)`,
      reference_type: 'JUAL_BEKAS',
      reference_id: sale.id,
      created_by: user.id
    })
    
  if (bankError) return { success: false, error: bankError.message }

  revalidatePath('/aki-bekas')
  return { success: true, message: 'Penjualan aki bekas berhasil dicatat' }
}
