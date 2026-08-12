import { createClient } from '@/lib/supabase/server'
import type { InventoryBatch } from '@/types/database'

// ============================================================
// FIFO CALCULATION ENGINE
// ============================================================

export interface FifoAllocation {
  batch_id: string
  qty_used: number
  harga_modal_unit: number
  subtotal_hpp: number
}

export interface FifoResult {
  allocations: FifoAllocation[]
  total_hpp: number
  success: boolean
  error?: string
}

/**
 * Kalkulasi HPP FIFO untuk satu product
 * Mengambil batch tertua (tanggal_masuk ASC) dengan qty_tersedia > 0
 * 
 * @param product_id - UUID produk
 * @param qty_needed - Jumlah unit yang akan dijual
 * @returns FifoResult dengan alokasi per batch dan total HPP
 */
export async function calculateFifo(
  product_id: string,
  qty_needed: number
): Promise<FifoResult> {
  const supabase = await createClient()

  // Ambil batch tersedia, urutan tanggal_masuk ASC (FIFO)
  const { data: batches, error } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('product_id', product_id)
    .gt('qty_tersedia', 0)
    .order('tanggal_masuk', { ascending: true })

  if (error) {
    return { allocations: [], total_hpp: 0, success: false, error: error.message }
  }

  if (!batches || batches.length === 0) {
    return { allocations: [], total_hpp: 0, success: false, error: 'Stok tidak tersedia' }
  }

  // Hitung total stok tersedia
  const totalAvailable = batches.reduce((sum, b) => sum + b.qty_tersedia, 0)
  if (totalAvailable < qty_needed) {
    return {
      allocations: [],
      total_hpp: 0,
      success: false,
      error: `Stok tidak mencukupi. Tersedia: ${totalAvailable}, Dibutuhkan: ${qty_needed}`,
    }
  }

  // Alokasi FIFO
  const allocations: FifoAllocation[] = []
  let remaining = qty_needed

  for (const batch of batches as InventoryBatch[]) {
    if (remaining <= 0) break

    const used = Math.min(remaining, batch.qty_tersedia)
    const subtotal_hpp = Math.round(used * batch.harga_modal_unit)

    allocations.push({
      batch_id: batch.id,
      qty_used: used,
      harga_modal_unit: batch.harga_modal_unit,
      subtotal_hpp,
    })

    remaining -= used
  }

  const total_hpp = allocations.reduce((sum, a) => sum + a.subtotal_hpp, 0)

  return { allocations, total_hpp, success: true }
}

/**
 * Hitung total stok tersedia untuk satu produk
 */
export async function getAvailableStock(product_id: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_batches')
    .select('qty_tersedia')
    .eq('product_id', product_id)
    .gt('qty_tersedia', 0)

  if (error || !data) return 0

  return data.reduce((sum, b) => sum + b.qty_tersedia, 0)
}

/**
 * Update qty_tersedia pada batch setelah penjualan
 * Harus dipanggil dalam transaksi yang sama dengan insert sale
 */
export async function applyFifoAllocations(
  allocations: FifoAllocation[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  for (const alloc of allocations) {
    // Ambil batch saat ini
    const { data: batch, error: fetchError } = await supabase
      .from('inventory_batches')
      .select('qty_tersedia')
      .eq('id', alloc.batch_id)
      .single()

    if (fetchError || !batch) {
      return { success: false, error: `Batch ${alloc.batch_id} tidak ditemukan` }
    }

    const newQty = batch.qty_tersedia - alloc.qty_used

    if (newQty < 0) {
      return {
        success: false,
        error: `Stok batch tidak mencukupi untuk batch ${alloc.batch_id}`,
      }
    }

    const { error: updateError } = await supabase
      .from('inventory_batches')
      .update({ qty_tersedia: newQty })
      .eq('id', alloc.batch_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  return { success: true }
}
