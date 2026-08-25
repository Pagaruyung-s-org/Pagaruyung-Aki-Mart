'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// TYPES
// ============================================================

interface OpeningBalanceInput {
  product_id: string
  qty: number
  harga_modal: number
  keterangan?: string
}

type ActionResult =
  | { success: true; message: string }
  | { success: false; error: string }

// ============================================================
// 1. SAVE OPENING BALANCE
// ============================================================
export async function saveOpeningBalance(
  input: OpeningBalanceInput
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Validasi input
  if (!input.product_id) return { success: false, error: 'Produk wajib dipilih' }
  if (input.qty < 0) return { success: false, error: 'Qty tidak boleh negatif' }
  if (input.harga_modal <= 0) return { success: false, error: 'Harga modal harus lebih dari 0' }

  // Cek apakah sudah ada opening balance
  const { data: existing } = await supabase
    .from('opening_balances')
    .select('id, is_locked')
    .eq('product_id', input.product_id)
    .maybeSingle()

  if (existing?.is_locked) {
    return {
      success: false,
      error: 'Opening balance sudah terkunci karena sudah ada transaksi. Gunakan Stok Opname untuk koreksi.',
    }
  }

  const now = new Date().toISOString()

  // Ambil nama produk
  const { data: product } = await supabase
    .from('products')
    .select('id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah')
    .eq('id', input.product_id)
    .single()

  if (!product) return { success: false, error: 'Produk tidak ditemukan' }

  const productName = product.kategori === 'Air Aki'
    ? product.merk
    : [product.merk, product.kategori, product.type, product.kode_baterai, `${product.kapasitas_ah}AH`].filter(Boolean).join(' ')

  if (existing) {
    // UPDATE existing opening balance (belum locked)

    // Update opening balance record
    await supabase
      .from('opening_balances')
      .update({
        qty: input.qty,
        harga_modal: input.harga_modal,
        keterangan: input.keterangan || null,
        updated_at: now,
      })
      .eq('id', existing.id)

    // Update existing batch
    const { data: oldBatches } = await supabase
      .from('inventory_batches')
      .select('id')
      .eq('product_id', input.product_id)
      .is('purchase_item_id', null)

    if (oldBatches && oldBatches.length > 0) {
      // Update only the first batch, delete any duplicates caused by previous bug
      for (let i = 0; i < oldBatches.length; i++) {
        const b = oldBatches[i]
        if (i === 0 && input.qty > 0) {
          await supabase.from('inventory_batches').update({
            qty_awal: input.qty,
            qty_tersedia: input.qty,
            harga_modal_unit: input.harga_modal,
          }).eq('id', b.id)
        } else {
          await supabase.from('inventory_batches').delete().eq('id', b.id)
        }
      }
    } else if (input.qty > 0) {
      await supabase.from('inventory_batches').insert({
        product_id: input.product_id,
        purchase_item_id: null,
        tanggal_masuk: now,
        qty_awal: input.qty,
        qty_tersedia: input.qty,
        harga_modal_unit: input.harga_modal,
      })
    }

    // Update existing movement
    const { data: oldMovements } = await supabase
      .from('inventory_movements')
      .select('id')
      .eq('product_id', input.product_id)
      .eq('movement_type', 'OPENING_BALANCE')
      .eq('reference_type', 'OPENING_BALANCE')

    if (oldMovements && oldMovements.length > 0) {
      // Update only the first movement, delete any duplicates
      for (let i = 0; i < oldMovements.length; i++) {
        const m = oldMovements[i]
        if (i === 0 && input.qty > 0) {
          await supabase.from('inventory_movements').update({
            qty_in: input.qty,
            transaction_date: now,
            keterangan: `Opening Balance (Revisi): ${productName} — ${input.qty} unit @ Rp${input.harga_modal.toLocaleString('id-ID')}${input.keterangan ? ` (${input.keterangan})` : ''}`,
          }).eq('id', m.id)
        } else {
          await supabase.from('inventory_movements').delete().eq('id', m.id)
        }
      }
    } else if (input.qty > 0) {
      await supabase.from('inventory_movements').insert({
        product_id: input.product_id,
        movement_type: 'OPENING_BALANCE',
        reference_type: 'OPENING_BALANCE',
        qty_in: input.qty,
        qty_out: 0,
        transaction_date: now,
        keterangan: `Opening Balance: ${productName} — ${input.qty} unit @ Rp${input.harga_modal.toLocaleString('id-ID')}${input.keterangan ? ` (${input.keterangan})` : ''}`,
      })
    }

  } else {
    // INSERT new opening balance
    const { error: obError } = await supabase
      .from('opening_balances')
      .insert({
        product_id: input.product_id,
        qty: input.qty,
        harga_modal: input.harga_modal,
        keterangan: input.keterangan || null,
        is_locked: false,
        created_by: user.id,
      })

    if (obError) return { success: false, error: obError.message }

    // Buat batch FIFO baru
    if (input.qty > 0) {
      await supabase.from('inventory_batches').insert({
        product_id: input.product_id,
        purchase_item_id: null,
        tanggal_masuk: now,
        qty_awal: input.qty,
        qty_tersedia: input.qty,
        harga_modal_unit: input.harga_modal,
      })
    }

    // Catat inventory movement
    if (input.qty > 0) {
      await supabase.from('inventory_movements').insert({
        product_id: input.product_id,
        movement_type: 'OPENING_BALANCE',
        reference_type: 'OPENING_BALANCE',
        qty_in: input.qty,
        qty_out: 0,
        transaction_date: now,
        keterangan: `Opening Balance: ${productName} — ${input.qty} unit @ Rp${input.harga_modal.toLocaleString('id-ID')}${input.keterangan ? ` (${input.keterangan})` : ''}`,
      })
    }
  }

  // Update qty_stok produk (berlaku untuk update maupun insert)
  await supabase
    .from('products')
    .update({ qty_stok: input.qty })
    .eq('id', input.product_id)

  revalidatePath('/stok')
  revalidatePath('/stok/mutasi')
  revalidatePath('/stok-opname')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: `Opening balance ${productName}: ${input.qty} unit @ Rp${input.harga_modal.toLocaleString('id-ID')}`,
  }
}

// ============================================================
// 2. GET OPENING BALANCES
// ============================================================
export async function getOpeningBalances() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('opening_balances')
    .select(`
      *,
      products (id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah, qty_stok, harga_jual, status)
    `)
    .order('created_at', { ascending: false })

  return data || []
}

// ============================================================
// 3. LOCK OPENING BALANCE (dipanggil saat transaksi pertama)
// ============================================================
export async function lockOpeningBalance(productId: string) {
  const supabase = await createClient()

  await supabase
    .from('opening_balances')
    .update({ is_locked: true })
    .eq('product_id', productId)
    .eq('is_locked', false)
}

// ============================================================
// 4. DELETE OPENING BALANCE (hanya jika belum locked)
// ============================================================
export async function deleteOpeningBalance(productId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Cek apakah locked
  const { data: ob } = await supabase
    .from('opening_balances')
    .select('id, is_locked')
    .eq('product_id', productId)
    .single()

  if (!ob) return { success: false, error: 'Opening balance tidak ditemukan' }
  if (ob.is_locked) {
    return { success: false, error: 'Opening balance sudah terkunci, tidak bisa dihapus' }
  }

  // Hapus opening balance
  await supabase.from('opening_balances').delete().eq('id', ob.id)

  // Hapus batch terkait
  await supabase
    .from('inventory_batches')
    .delete()
    .eq('product_id', productId)
    .is('purchase_item_id', null)

  // Hapus movement terkait
  await supabase
    .from('inventory_movements')
    .delete()
    .eq('product_id', productId)
    .eq('movement_type', 'OPENING_BALANCE')

  // Reset qty_stok
  await supabase
    .from('products')
    .update({ qty_stok: 0 })
    .eq('id', productId)

  revalidatePath('/stok')
  revalidatePath('/stok/mutasi')
  revalidatePath('/stok-opname')

  return { success: true, message: 'Opening balance berhasil dihapus' }
}
