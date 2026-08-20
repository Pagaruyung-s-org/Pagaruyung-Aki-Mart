'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { applyFifoAllocations, calculateFifo } from '@/lib/fifo'

// ============================================================
// TYPES
// ============================================================

interface PhysicalCountItem {
  product_id: string
  physical_qty: number
  harga_modal_aktual?: number | null  // manual override untuk surplus
  keterangan?: string
}

type ActionResult =
  | { success: true; message: string; data?: any }
  | { success: false; error: string }

// ============================================================
// HELPER: Expire sesi yang sudah lewat hari
// ============================================================
async function expireOldSessions() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  await supabase
    .from('opname_sessions')
    .update({ status: 'EXPIRED' })
    .eq('status', 'IN_PROGRESS')
    .lt('tanggal', today)
}

// ============================================================
// HELPER: Get latest harga modal for a product
// ============================================================
async function getLatestHargaModal(productId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_batches')
    .select('harga_modal_unit')
    .eq('product_id', productId)
    .order('tanggal_masuk', { ascending: false })
    .limit(1)
    .single()

  return data?.harga_modal_unit ?? null
}

// ============================================================
// 1. START OPNAME SESSION
// ============================================================
export async function startOpnameSession(
  productIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Auto-expire sesi lama
  await expireOldSessions()

  // Cek apakah sudah ada sesi aktif
  const { data: activeSessions } = await supabase
    .from('opname_sessions')
    .select('id, kode_opname')
    .eq('status', 'IN_PROGRESS')
    .limit(1)

  if (activeSessions && activeSessions.length > 0) {
    return {
      success: false,
      error: `Masih ada sesi opname aktif (${activeSessions[0].kode_opname}). Selesaikan atau tunggu hingga kadaluarsa.`,
    }
  }

  if (!productIds || productIds.length === 0) {
    return { success: false, error: 'Pilih minimal 1 produk untuk diopname' }
  }

  // Generate kode opname
  const { data: kodeData } = await supabase.rpc('generate_kode_opname')
  const kode = kodeData || `SO-${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 8)}-0001`

  const today = new Date().toISOString().split('T')[0]

  // Insert sesi
  const { data: session, error: sessionError } = await supabase
    .from('opname_sessions')
    .insert({
      kode_opname: kode,
      tanggal: today,
      status: 'IN_PROGRESS',
      started_by: user.id,
    })
    .select()
    .single()

  if (sessionError || !session) {
    return { success: false, error: sessionError?.message || 'Gagal membuat sesi opname' }
  }

  // Ambil qty_stok terkini untuk snapshot
  const { data: products } = await supabase
    .from('products')
    .select('id, qty_stok')
    .in('id', productIds)

  if (!products || products.length === 0) {
    return { success: false, error: 'Produk tidak ditemukan' }
  }

  // Insert items dengan snapshot
  const items = products.map((p) => ({
    session_id: session.id,
    product_id: p.id,
    system_qty_snapshot: p.qty_stok,
  }))

  const { error: itemsError } = await supabase
    .from('opname_items')
    .insert(items)

  if (itemsError) {
    // Rollback sesi
    await supabase.from('opname_sessions').delete().eq('id', session.id)
    return { success: false, error: itemsError.message }
  }

  revalidatePath('/stok-opname')
  return {
    success: true,
    message: `Sesi opname ${kode} dimulai dengan ${products.length} produk`,
    data: session,
  }
}

// ============================================================
// 2. GET ACTIVE SESSION
// ============================================================
export async function getActiveSession() {
  const supabase = await createClient()

  // Auto-expire sesi lama dulu
  await expireOldSessions()

  const { data: session } = await supabase
    .from('opname_sessions')
    .select(`
      *,
      opname_items (
        *,
        products (id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah, qty_stok, harga_jual)
      )
    `)
    .eq('status', 'IN_PROGRESS')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return session
}

// ============================================================
// 3. SAVE PHYSICAL COUNT (Draft — tanpa finalisasi)
// ============================================================
export async function savePhysicalCount(
  sessionId: string,
  items: PhysicalCountItem[]
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Validasi sesi masih aktif
  const { data: session } = await supabase
    .from('opname_sessions')
    .select('id, status')
    .eq('id', sessionId)
    .single()

  if (!session) return { success: false, error: 'Sesi opname tidak ditemukan' }
  if (session.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Sesi opname sudah tidak aktif' }
  }

  // Update setiap item
  for (const item of items) {
    if (item.physical_qty < 0) {
      return { success: false, error: 'Qty fisik tidak boleh negatif' }
    }

    const updateData: Record<string, any> = {
      physical_qty: item.physical_qty,
    }

    if (item.keterangan !== undefined) {
      updateData.keterangan = item.keterangan
    }

    if (item.harga_modal_aktual !== undefined) {
      updateData.harga_modal_aktual = item.harga_modal_aktual
    }

    await supabase
      .from('opname_items')
      .update(updateData)
      .eq('session_id', sessionId)
      .eq('product_id', item.product_id)
  }

  revalidatePath('/stok-opname')
  return { success: true, message: 'Draft berhasil disimpan' }
}

// ============================================================
// 4. COMPLETE OPNAME SESSION (Finalisasi)
// ============================================================
export async function completeOpnameSession(
  sessionId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Ambil sesi + items
  const { data: session } = await supabase
    .from('opname_sessions')
    .select(`
      *,
      opname_items (
        *,
        products (id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah, qty_stok)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (!session) return { success: false, error: 'Sesi tidak ditemukan' }
  if (session.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Sesi sudah tidak aktif' }
  }

  const items = session.opname_items || []

  // Validasi: semua item harus sudah diisi physical_qty
  const unfilledItems = items.filter((item: any) => item.physical_qty === null)
  if (unfilledItems.length > 0) {
    return {
      success: false,
      error: `Masih ada ${unfilledItems.length} produk yang belum diisi qty fisik`,
    }
  }

  const now = new Date().toISOString()
  let totalAdjusted = 0

  for (const item of items) {
    const physicalQty = item.physical_qty!
    const snapshot = item.system_qty_snapshot

    // Hitung expected_qty: snapshot + barang masuk - barang keluar selama sesi
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('qty_in, qty_out')
      .eq('product_id', item.product_id)
      .gte('transaction_date', session.started_at)
      .neq('movement_type', 'ADJUSTMENT_IN')
      .neq('movement_type', 'ADJUSTMENT_OUT')

    let totalIn = 0
    let totalOut = 0
    if (movements) {
      for (const m of movements) {
        totalIn += Number(m.qty_in || 0)
        totalOut += Number(m.qty_out || 0)
      }
    }

    const expectedQty = snapshot + totalIn - totalOut
    const selisih = physicalQty - expectedQty

    // Update opname_item dengan expected dan selisih
    await supabase
      .from('opname_items')
      .update({
        expected_qty: expectedQty,
        selisih: selisih,
      })
      .eq('id', item.id)

    // Jika ada selisih, validasi keterangan
    if (selisih !== 0 && (!item.keterangan || !item.keterangan.trim())) {
      return {
        success: false,
        error: `Keterangan wajib diisi untuk produk ${item.products?.kode_produk || item.product_id} yang memiliki selisih`,
      }
    }

    // Proses penyesuaian stok
    if (selisih < 0) {
      // DEFISIT — kurangi stok via FIFO
      const qtyKurang = Math.abs(selisih)

      const fifoResult = await calculateFifo(item.product_id, qtyKurang)
      if (!fifoResult.success) {
        // Jika FIFO gagal (stok batch tidak cukup), tetap update qty_stok langsung
        // Ini bisa terjadi jika batch sudah habis tapi qty_stok masih ada (data inconsistent)
        console.warn(`FIFO gagal untuk ${item.product_id}: ${fifoResult.error}. Update qty_stok langsung.`)
      } else {
        await applyFifoAllocations(fifoResult.allocations)
      }

      // Update qty_stok produk
      await supabase
        .from('products')
        .update({ qty_stok: physicalQty })
        .eq('id', item.product_id)

      // Catat movement
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'ADJUSTMENT_OUT',
        reference_type: 'OPNAME',
        reference_id: session.id,
        qty_in: 0,
        qty_out: qtyKurang,
        transaction_date: now,
        keterangan: `Stok Opname ${session.kode_opname}: ${item.keterangan} (Expected: ${expectedQty} → Fisik: ${physicalQty})`,
      })

      totalAdjusted++
    } else if (selisih > 0) {
      // SURPLUS — tambah stok
      const qtyTambah = selisih

      // Tentukan harga modal
      let hargaModal = item.harga_modal_aktual
      if (!hargaModal || hargaModal <= 0) {
        // Ambil dari batch terakhir
        hargaModal = await getLatestHargaModal(item.product_id)
      }

      if (!hargaModal || hargaModal <= 0) {
        return {
          success: false,
          error: `Harga modal tidak ditemukan untuk produk ${item.products?.kode_produk}. Silakan isi harga modal secara manual.`,
        }
      }

      // Buat batch baru
      await supabase.from('inventory_batches').insert({
        product_id: item.product_id,
        purchase_item_id: null,
        tanggal_masuk: now,
        qty_awal: qtyTambah,
        qty_tersedia: qtyTambah,
        harga_modal_unit: hargaModal,
      })

      // Update qty_stok produk
      await supabase
        .from('products')
        .update({ qty_stok: physicalQty })
        .eq('id', item.product_id)

      // Catat movement
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'ADJUSTMENT_IN',
        reference_type: 'OPNAME',
        reference_id: session.id,
        qty_in: qtyTambah,
        qty_out: 0,
        transaction_date: now,
        keterangan: `Stok Opname ${session.kode_opname}: ${item.keterangan} (Expected: ${expectedQty} → Fisik: ${physicalQty}, HPP: Rp${hargaModal.toLocaleString('id-ID')})`,
      })

      totalAdjusted++
    }
    // selisih === 0: tidak ada perubahan
  }

  // Update sesi → COMPLETED
  await supabase
    .from('opname_sessions')
    .update({
      status: 'COMPLETED',
      completed_at: now,
      completed_by: user.id,
    })
    .eq('id', sessionId)

  revalidatePath('/stok')
  revalidatePath('/stok/mutasi')
  revalidatePath('/stok-opname')
  revalidatePath('/dashboard')

  return {
    success: true,
    message: `Sesi opname ${session.kode_opname} selesai. ${totalAdjusted} produk disesuaikan dari ${items.length} total.`,
  }
}

// ============================================================
// 5. GET SESSION HISTORY
// ============================================================
export async function getSessionHistory() {
  const supabase = await createClient()

  // Auto-expire dulu
  await expireOldSessions()

  const { data } = await supabase
    .from('opname_sessions')
    .select(`
      *,
      opname_items (count)
    `)
    .in('status', ['COMPLETED', 'EXPIRED'])
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

// ============================================================
// 6. GET SESSION DETAIL
// ============================================================
export async function getSessionDetail(sessionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('opname_sessions')
    .select(`
      *,
      opname_items (
        *,
        products (id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah)
      )
    `)
    .eq('id', sessionId)
    .single()

  return data
}

// ============================================================
// 7. GET LATEST HARGA MODAL (for UI pre-fill)
// ============================================================
export async function getLatestHargaModalForProduct(productId: string): Promise<number | null> {
  return await getLatestHargaModal(productId)
}
