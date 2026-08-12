'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hitungHargaModalUnit, hitungPajak } from '@/lib/utils'
import { calculateFifo, applyFifoAllocations } from '@/lib/fifo'
import type { CreatePurchaseInput, CreateSaleInput, CreateExpenseInput, CreateSupplierPaymentInput } from '@/types/database'

// ============================================================
// SCHEMA VALIDASI ZOD
// ============================================================

const PurchaseItemSchema = z.object({
  product_id: z.string().uuid('Product ID tidak valid'),
  qty: z.number().positive('Qty harus lebih dari 0'),
  nominal: z.number().positive('Nominal harus lebih dari 0'),
})

const CreatePurchaseSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  supplier_id: z.string().uuid('Supplier tidak valid'),
  status_pembayaran: z.enum(['LUNAS', 'HUTANG', 'PARSIAL']),
  keterangan: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'Minimal 1 item'),
})

const CreateSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().positive(),
  harga_jual: z.number().min(0),
  discount: z.number().min(0).optional(),
})

const CreateSaleSchema = z.object({
  customer_name: z.string().optional(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS']),
  discount: z.number().min(0).optional(),
  keterangan: z.string().optional(),
  items: z.array(CreateSaleItemSchema).optional().default([]),
})

const CreateExpenseSchema = z.object({
  tanggal: z.string().min(1),
  category_id: z.string().uuid(),
  employee_id: z.string().uuid().optional(),
  keterangan: z.string().optional(),
  nominal: z.number().positive(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS']),
})

const CreatePaymentSchema = z.object({
  supplier_id: z.string().uuid(),
  purchase_id: z.string().uuid().optional(),
  tanggal: z.string().min(1),
  nominal: z.number().positive(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS']),
  keterangan: z.string().optional(),
})

// ============================================================
// ACTION RESULT TYPE
// ============================================================
type ActionResult<T = null> =
  | { success: true; data: T; message: string }
  | { success: false; error: string }

// ============================================================
// SERVER ACTION: BUAT PEMBELIAN
// ============================================================
export async function createPurchase(input: CreatePurchaseInput): Promise<ActionResult<{ id: string; kode: string }>> {
  const parsed = CreatePurchaseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  // Validasi semua product_id aktif
  let isAllAirAki = true
  for (const item of data.items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, status, kategori, merk, type, kode_baterai, kapasitas_ah')
      .eq('id', item.product_id)
      .single()
    if (!product) {
      return { success: false, error: 'Produk yang dipilih tidak ditemukan' }
    }
    const productName = product.kategori === 'Air Aki' 
      ? product.merk 
      : [product.merk, product.kategori, product.type, product.kode_baterai, `${product.kapasitas_ah}AH`].filter(Boolean).join(' · ')
    
    if (!product.status) {
      return { success: false, error: `Produk ${productName} tidak aktif` }
    }
    if (product.kategori !== 'Air Aki') {
      isAllAirAki = false
    }
  }

  // Hitung nominal, pajak, total
  const totalNominal = data.items.reduce((sum, i) => sum + i.nominal, 0)
  const pajak = isAllAirAki ? 0 : hitungPajak(totalNominal)
  const total = totalNominal + pajak

  // Generate kode pembelian dari database function
  const { data: kodeData } = await supabase.rpc('generate_kode_pembelian')
  const kode_pembelian = kodeData as string

  // Insert purchase_transaction
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchase_transactions')
    .insert({
      kode_pembelian,
      tanggal: data.tanggal,
      supplier_id: data.supplier_id,
      nominal: totalNominal,
      pajak,
      total,
      status_pembayaran: data.status_pembayaran,
      status_transaksi: 'POSTED',
      keterangan: data.keterangan,
      created_by: user.id,
    })
    .select()
    .single()

  if (purchaseError || !purchase) {
    return { success: false, error: purchaseError?.message ?? 'Gagal membuat pembelian' }
  }

  // Insert purchase_items + inventory_batches per item
  for (const item of data.items) {
    const harga_modal_unit = hitungHargaModalUnit(item.nominal, item.qty)

    // Insert purchase_item
    const { data: purchaseItem, error: itemError } = await supabase
      .from('purchase_items')
      .insert({
        purchase_id: purchase.id,
        product_id: item.product_id,
        qty: item.qty,
        nominal: item.nominal,
        harga_modal_unit,
      })
      .select()
      .single()

    if (itemError || !purchaseItem) {
      return { success: false, error: itemError?.message ?? 'Gagal menyimpan item pembelian' }
    }

    // Cari batch dengan harga modal yang sama
    const { data: existingBatches } = await supabase
      .from('inventory_batches')
      .select('id, qty_awal, qty_tersedia')
      .eq('product_id', item.product_id)
      .eq('harga_modal_unit', harga_modal_unit)
      .limit(1)

    const existingBatch = existingBatches?.[0]

    if (existingBatch) {
      // Gabungkan ke batch lama (tambah qty)
      const { error: batchError } = await supabase
        .from('inventory_batches')
        .update({
          qty_awal: existingBatch.qty_awal + item.qty,
          qty_tersedia: existingBatch.qty_tersedia + item.qty,
        })
        .eq('id', existingBatch.id)

      if (batchError) return { success: false, error: batchError.message }
    } else {
      // Buat inventory batch baru (FIFO)
      const { error: batchError } = await supabase
        .from('inventory_batches')
        .insert({
          product_id: item.product_id,
          purchase_item_id: purchaseItem.id,
          tanggal_masuk: data.tanggal,
          qty_awal: item.qty,
          qty_tersedia: item.qty,
          harga_modal_unit,
        })

      if (batchError) return { success: false, error: batchError.message }
    }

    // Catat inventory movement (PURCHASE)
    await supabase.from('inventory_movements').insert({
      product_id: item.product_id,
      movement_type: 'PURCHASE',
      reference_id: purchase.id,
      reference_type: 'PURCHASE',
      qty_in: item.qty,
      qty_out: 0,
      transaction_date: new Date().toISOString(),
      keterangan: `Pembelian ${kode_pembelian}`,
    })

    // Update qty_stok produk langsung
    const { data: currentProduct } = await supabase
      .from('products')
      .select('qty_stok')
      .eq('id', item.product_id)
      .single()

    if (currentProduct) {
      await supabase
        .from('products')
        .update({ qty_stok: currentProduct.qty_stok + item.qty })
        .eq('id', item.product_id)
    }
  }

  // Jika LUNAS → catat kas keluar
  if (data.status_pembayaran === 'LUNAS') {
    await supabase.from('cash_transactions').insert({
      tanggal: new Date().toISOString(),
      account_type: 'KAS',
      transaction_type: 'CREDIT',
      reference_type: 'PURCHASE',
      reference_id: purchase.id,
      debit: 0,
      credit: total,
      description: `Pembayaran pembelian ${kode_pembelian}`,
    })
  }

  revalidatePath('/pembelian')
  revalidatePath('/stok')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: purchase.id, kode: kode_pembelian },
    message: `Pembelian ${kode_pembelian} berhasil disimpan`,
  }
}

// ============================================================
// SERVER ACTION: BUAT PENJUALAN (dengan FIFO)
// ============================================================
export async function createSale(input: CreateSaleInput): Promise<ActionResult<{ id: string; kode: string }>> {
  const parsed = CreateSaleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  // Hitung FIFO untuk semua item terlebih dahulu
  type ItemFifo = {
    product_id: string
    qty: number
    harga_jual: number
    subtotal: number
    hpp_fifo: number
    laba_kotor: number
    fifo: Awaited<ReturnType<typeof calculateFifo>>
  }

  const itemsWithFifo: ItemFifo[] = []
  for (const item of data.items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, status, harga_jual, merk, kategori, type, kode_baterai, kapasitas_ah')
      .eq('id', item.product_id)
      .single()

    if (!product) {
      return { success: false, error: `Produk yang dipilih tidak ditemukan` }
    }

    const productName = product.kategori === 'Air Aki' 
      ? product.merk 
      : [product.merk, product.kategori, product.type, product.kode_baterai, `${product.kapasitas_ah}AH`].filter(Boolean).join(' · ')

    if (!product.status) {
      return { success: false, error: `Produk ${productName} tidak aktif` }
    }

    const fifoResult = await calculateFifo(item.product_id, item.qty)
    if (!fifoResult.success) {
      return { success: false, error: `Stok ${productName} kurang. ${fifoResult.error}` }
    }

    const itemDiscount = item.discount ?? 0
    const subtotal = (item.qty * item.harga_jual) - itemDiscount

    const hpp_fifo = fifoResult.total_hpp
    const laba_kotor = subtotal - hpp_fifo

    itemsWithFifo.push({
      product_id: item.product_id,
      qty: item.qty,
      harga_jual: item.harga_jual,
      subtotal,
      hpp_fifo,
      laba_kotor,
      fifo: fifoResult,
    })
  }

  // Hitung total penjualan
  const subtotalAll = itemsWithFifo.reduce((sum, i) => sum + i.subtotal, 0)
  const discount = data.discount ?? 0
  const total = subtotalAll - discount

  // Generate kode penjualan
  const { data: kodeData } = await supabase.rpc('generate_kode_penjualan')
  const kode_penjualan = kodeData as string

  // Insert sale header
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      kode_penjualan,
      tanggal: new Date().toISOString(),
      customer_name: data.customer_name,
      subtotal: subtotalAll,
      discount,
      total,
      payment_method: data.payment_method,
      status_transaksi: 'PAID',
      keterangan: data.keterangan,
      created_by: user.id,
      include_air_aki: false, // legacy compat
      jumlah_air_aki: 0,
      harga_jual_air_aki: 0,
      hpp_air_aki: 0,
      laba_air_aki: 0,
    })
    .select()
    .single()

  if (saleError || !sale) {
    return { success: false, error: saleError?.message ?? 'Gagal membuat penjualan' }
  }

  // Insert sale_items + alokasi FIFO per item
  for (const itemData of itemsWithFifo) {
    const { data: saleItem, error: saleItemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        product_id: itemData.product_id,
        qty: itemData.qty,
        harga_jual: itemData.harga_jual,
        subtotal: itemData.subtotal,
        hpp_fifo: itemData.hpp_fifo,
        laba_kotor: itemData.laba_kotor,
      })
      .select()
      .single()

    if (saleItemError || !saleItem) {
      return { success: false, error: saleItemError?.message ?? 'Gagal menyimpan item penjualan' }
    }

    // Insert sale_batch_allocations (detail FIFO)
    for (const alloc of itemData.fifo.allocations) {
      await supabase.from('sale_batch_allocations').insert({
        sale_item_id: saleItem.id,
        batch_id: alloc.batch_id,
        qty_used: alloc.qty_used,
        harga_modal_unit: alloc.harga_modal_unit,
        subtotal_hpp: alloc.subtotal_hpp,
      })
    }

    // Kurangi qty_tersedia batch FIFO
    await applyFifoAllocations(itemData.fifo.allocations)

    // Catat inventory movement (SALE)
    await supabase.from('inventory_movements').insert({
      product_id: itemData.product_id,
      movement_type: 'SALE',
      reference_id: sale.id,
      reference_type: 'SALE',
      qty_in: 0,
      qty_out: itemData.qty,
      transaction_date: new Date().toISOString(),
      keterangan: `Penjualan ${kode_penjualan}`,
    })

    // Update qty_stok produk
    const { data: currentProduct } = await supabase
      .from('products')
      .select('qty_stok')
      .eq('id', itemData.product_id)
      .single()

    if (currentProduct) {
      await supabase
        .from('products')
        .update({ qty_stok: Math.max(0, currentProduct.qty_stok - itemData.qty) })
        .eq('id', itemData.product_id)
    }
  }


  // Catat kas masuk dari penjualan
  await supabase.from('cash_transactions').insert({
    tanggal: new Date().toISOString(),
    account_type: 'KAS',
    transaction_type: 'DEBIT',
    reference_type: 'SALE',
    reference_id: sale.id,
    debit: total,
    credit: 0,
    description: `Penjualan ${kode_penjualan}`,
  })

  revalidatePath('/penjualan')
  revalidatePath('/stok')
  revalidatePath('/stok/air-aki')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: sale.id, kode: kode_penjualan },
    message: `Penjualan ${kode_penjualan} berhasil disimpan`,
  }
}

// ============================================================
// SERVER ACTION: CATAT BIAYA OPERASIONAL
// ============================================================
export async function createExpense(input: CreateExpenseInput): Promise<ActionResult<{ id: string; kode: string }>> {
  const parsed = CreateExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  const { data: kodeData } = await supabase.rpc('generate_kode_pengeluaran')
  const kode_pengeluaran = kodeData as string

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      kode_pengeluaran,
      tanggal: data.tanggal,
      category_id: data.category_id,
      employee_id: data.employee_id ?? null,
      keterangan: data.keterangan,
      nominal: data.nominal,
      payment_method: data.payment_method,
      status_transaksi: 'POSTED',
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !expense) {
    return { success: false, error: error?.message ?? 'Gagal menyimpan biaya operasional' }
  }

  // Catat kas keluar
  await supabase.from('cash_transactions').insert({
    tanggal: new Date().toISOString(),
    account_type: 'KAS',
    transaction_type: 'CREDIT',
    reference_type: 'EXPENSE',
    reference_id: expense.id,
    debit: 0,
    credit: data.nominal,
    description: `Biaya operasional ${kode_pengeluaran}`,
  })

  revalidatePath('/operasional')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: expense.id, kode: kode_pengeluaran },
    message: `Biaya operasional ${kode_pengeluaran} berhasil dicatat`,
  }
}

// ============================================================
// SERVER ACTION: BAYAR HUTANG SUPPLIER
// ============================================================
export async function createSupplierPayment(input: CreateSupplierPaymentInput): Promise<ActionResult<{ id: string; kode: string }>> {
  const parsed = CreatePaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  const { data: kodeData } = await supabase.rpc('generate_kode_pembayaran')
  const kode_pembayaran = kodeData as string

  const { data: payment, error } = await supabase
    .from('supplier_payments')
    .insert({
      kode_pembayaran,
      supplier_id: data.supplier_id,
      purchase_id: data.purchase_id ?? null,
      tanggal: data.tanggal,
      nominal: data.nominal,
      payment_method: data.payment_method,
      keterangan: data.keterangan,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !payment) {
    return { success: false, error: error?.message ?? 'Gagal menyimpan pembayaran hutang' }
  }

  // Catat kas keluar
  await supabase.from('cash_transactions').insert({
    tanggal: new Date().toISOString(),
    account_type: 'KAS',
    transaction_type: 'CREDIT',
    reference_type: 'PAYMENT',
    reference_id: payment.id,
    debit: 0,
    credit: data.nominal,
    description: `Pembayaran hutang ${kode_pembayaran}`,
  })

  // Update status pembayaran purchase jika terkait
  if (data.purchase_id) {
    const { data: purchase } = await supabase
      .from('purchase_transactions')
      .select('total')
      .eq('id', data.purchase_id)
      .single()

    if (purchase) {
      const { data: totalPaid } = await supabase
        .from('supplier_payments')
        .select('nominal')
        .eq('purchase_id', data.purchase_id)

      const paidAmount = totalPaid?.reduce((s, p) => s + p.nominal, 0) ?? 0

      let newStatus: 'LUNAS' | 'PARSIAL' | 'HUTANG' = 'HUTANG'
      if (paidAmount >= purchase.total) newStatus = 'LUNAS'
      else if (paidAmount > 0) newStatus = 'PARSIAL'

      await supabase
        .from('purchase_transactions')
        .update({ status_pembayaran: newStatus })
        .eq('id', data.purchase_id)
    }
  }

  revalidatePath('/hutang')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: payment.id, kode: kode_pembayaran },
    message: `Pembayaran hutang ${kode_pembayaran} berhasil dicatat`,
  }
}
