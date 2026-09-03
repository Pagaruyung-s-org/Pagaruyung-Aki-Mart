'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { hitungHargaModalUnit } from '@/lib/utils'
import { calculateFifo, applyFifoAllocations } from '@/lib/fifo'
import { lockOpeningBalance } from '@/actions/opening-balance'
import type { CreatePurchaseInput, CreateSaleInput, CreateExpenseInput, CreateSupplierPaymentInput, AccountType } from '@/types/database'

async function getAccountType(supabase: any, accountId: string | null | undefined): Promise<AccountType> {
  if (!accountId) return 'KAS'
  const { data } = await supabase.from('accounts').select('type').eq('id', accountId).single()
  return (data?.type as AccountType) || 'KAS'
}

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
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BRANKAS']).optional(),
  account_id: z.string().uuid().optional(),
  keterangan: z.string().optional(),
  nama_sales: z.string().optional(),
  nomor_faktur: z.string().optional(),
  tanggal_faktur: z.string().optional(),
  tanggal_jatuh_tempo: z.string().optional(),
  tanggal_sampai: z.string().optional(),
  foto_faktur_url: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'Minimal 1 item'),
})

const CreateSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().positive(),
  harga_jual: z.number().min(0),
  discount: z.number().optional(),
})

const CreateSaleSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  customer_name: z.string().optional(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS']),
  account_id: z.string().uuid().optional(),
  discount: z.number().optional(),
  keterangan: z.string().optional(),
  is_indent: z.boolean().optional(),
  dp_amount: z.number().min(0).optional(),
  items: z.array(CreateSaleItemSchema).optional().default([]),
})

const CreateExpenseSchema = z.object({
  tanggal: z.string().min(1),
  category_id: z.string().uuid(),
  employee_id: z.string().uuid().optional(),
  keterangan: z.string().optional(),
  nominal: z.number().positive(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BRANKAS']),
  account_id: z.string().uuid().optional(),
})

const CreatePaymentSchema = z.object({
  supplier_id: z.string().uuid(),
  purchase_id: z.string().uuid().optional(),
  tanggal: z.string().min(1),
  nominal: z.number().positive(),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BRANKAS']),
  account_id: z.string().uuid().optional(),
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
  const pajak = 0 // Pajak ditiadakan sesuai permintaan user
  const total = totalNominal + pajak

  // Generate kode pembelian dari database function
  const { data: kodeData } = await supabase.rpc('generate_kode_pembelian')
  const kode_pembelian = kodeData as string

  // Cari nama akun (hanya jika LUNAS dan ada account_id)
  let accountName = ''
  if (data.status_pembayaran === 'LUNAS' && data.account_id) {
    const { data: acc } = await supabase.from('accounts').select('name').eq('id', data.account_id).single()
    if (acc) accountName = acc.name
  }
  const tag = accountName ? `Akun: ${accountName}` : ''
  const finalKeterangan = [data.keterangan, tag].filter(Boolean).join(' | ')

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
      keterangan: finalKeterangan,
      nama_sales: data.nama_sales || null,
      nomor_faktur: data.nomor_faktur || null,
      tanggal_faktur: data.tanggal_faktur || null,
      tanggal_jatuh_tempo: data.tanggal_jatuh_tempo || null,
      tanggal_sampai: data.tanggal_sampai || null,
      foto_faktur_url: data.foto_faktur_url || null,
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

    // Lock opening balance
    await lockOpeningBalance(item.product_id)

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
      transaction_date: data.tanggal,
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
  if (data.status_pembayaran === 'LUNAS' && data.account_id) {
    await supabase.from('cash_transactions').insert({
      tanggal: data.tanggal,
      account_id: data.account_id,
      account_type: await getAccountType(supabase, data.account_id),
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
// SERVER ACTION: GET SALE BY ID (untuk Faktur)
// ============================================================
export async function getSaleById(saleId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items(
        qty,
        harga_jual,
        subtotal,
        products(merk, kategori, type, kode_baterai, kapasitas_ah, kode_produk)
      )
    `)
    .eq('id', saleId)
    .single()

  if (error || !data) return null
  return data
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
    fifo?: Awaited<ReturnType<typeof calculateFifo>>
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

    if (!data.is_indent && !product.status) {
      return { success: false, error: `Produk ${productName} tidak aktif. Gunakan fitur Inden.` }
    }

    const itemDiscount = item.discount ?? 0
    const subtotal = (item.qty * item.harga_jual) - itemDiscount

    let hpp_fifo = 0
    let laba_kotor = 0
    let fifoResult = undefined

    if (!data.is_indent) {
      const result = await calculateFifo(item.product_id, item.qty)
      if (!result.success) {
        return { success: false, error: `Stok ${productName} kurang. ${result.error}` }
      }
      fifoResult = result
      hpp_fifo = result.total_hpp
      laba_kotor = subtotal - hpp_fifo

      // Lock opening balance
      await lockOpeningBalance(item.product_id)
    }

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

  const dpAmount = data.is_indent ? (data.dp_amount ?? 0) : 0
  if (data.is_indent && dpAmount > total) {
    return { success: false, error: 'Nominal DP tidak boleh melebihi total penjualan' }
  }

  // Generate kode penjualan
  const { data: kodeData } = await supabase.rpc('generate_kode_penjualan')
  const kode_penjualan = kodeData as string

  // Cari nama akun
  let accountName = ''
  if (data.account_id) {
    const { data: acc } = await supabase.from('accounts').select('name').eq('id', data.account_id).single()
    if (acc) accountName = acc.name
  }
  const tag = accountName ? `Akun: ${accountName}` : ''
  const finalKeterangan = [data.keterangan, tag].filter(Boolean).join(' | ')

  // Insert sale header
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      kode_penjualan,
      tanggal: data.tanggal,
      customer_name: data.customer_name,
      subtotal: subtotalAll,
      discount,
      total,
      dp_amount: dpAmount,
      payment_method: data.payment_method,
      status_transaksi: data.is_indent ? 'INDENT' : 'PAID',
      keterangan: finalKeterangan,
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

    if (!data.is_indent && itemData.fifo) {
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
        transaction_date: data.tanggal,
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
  }


  // Catat kas masuk dari penjualan
  const cashIn = data.is_indent ? dpAmount : total
  if (cashIn > 0 && data.account_id) {
    await supabase.from('cash_transactions').insert({
      tanggal: data.tanggal,
      account_id: data.account_id,
      account_type: await getAccountType(supabase, data.account_id),
      transaction_type: 'DEBIT',
      reference_type: 'SALE',
      reference_id: sale.id,
      debit: cashIn,
      credit: 0,
      description: data.is_indent ? `DP Inden ${kode_penjualan}` : `Penjualan ${kode_penjualan}`,
    })
  }

  revalidatePath('/penjualan')
  revalidatePath('/stok')
  revalidatePath('/stok/air-aki')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: sale.id, kode: kode_penjualan },
    message: data.is_indent ? `Inden ${kode_penjualan} berhasil disimpan` : `Penjualan ${kode_penjualan} berhasil disimpan`,
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

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()

  const data = parsed.data

  if (roleData?.role === 'ADMIN') {
    if (data.payment_method !== 'CASH') {
      return { success: false, error: 'Admin hanya dapat mencatat pengeluaran menggunakan metode Tunai' }
    }
    const { data: kasToko } = await supabase.from('accounts').select('id').eq('type', 'KAS').limit(1).single()
    if (data.account_id !== kasToko?.id) {
      return { success: false, error: 'Admin hanya dapat mencatat pengeluaran yang bersumber dari Kas Toko' }
    }
  }

  const { data: kodeData } = await supabase.rpc('generate_kode_pengeluaran')
  const kode_expense = kodeData as string

  // Cari nama akun
  let accountName = ''
  if (data.account_id) {
    const { data: acc } = await supabase.from('accounts').select('name').eq('id', data.account_id).single()
    if (acc) accountName = acc.name
  }
  const tag = accountName ? `Akun: ${accountName}` : ''
  const finalKeterangan = [data.keterangan, tag].filter(Boolean).join(' | ')

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      kode_pengeluaran: kode_expense,
      tanggal: data.tanggal,
      category_id: data.category_id,
      employee_id: data.employee_id,
      keterangan: finalKeterangan,
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
    tanggal: data.tanggal,
    account_id: data.account_id,
    account_type: await getAccountType(supabase, data.account_id),
    transaction_type: 'CREDIT',
    reference_type: 'EXPENSE',
    reference_id: expense.id,
    debit: 0,
    credit: data.nominal,
    description: `Biaya operasional ${kode_expense}`,
  })

  revalidatePath('/operasional')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: expense.id, kode: kode_expense },
    message: `Biaya operasional ${kode_expense} berhasil dicatat`,
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

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk membayar hutang' }
  }

  const data = parsed.data

  const { data: kodeData } = await supabase.rpc('generate_kode_supplier_payment')
  const kode_payment = kodeData as string

  // Cari nama akun
  let accountName = ''
  if (data.account_id) {
    const { data: acc } = await supabase.from('accounts').select('name').eq('id', data.account_id).single()
    if (acc) accountName = acc.name
  }
  const tag = accountName ? `Akun: ${accountName}` : ''
  const finalKeterangan = [data.keterangan, tag].filter(Boolean).join(' | ')

  const { data: payment, error } = await supabase
    .from('supplier_payments')
    .insert({
      kode_payment,
      supplier_id: data.supplier_id,
      purchase_id: data.purchase_id,
      tanggal: data.tanggal,
      nominal: data.nominal,
      payment_method: data.payment_method,
      keterangan: finalKeterangan,
      status_payment: 'POSTED',
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !payment) {
    return { success: false, error: error?.message ?? 'Gagal menyimpan pembayaran hutang' }
  }

  // Catat kas keluar
  await supabase.from('cash_transactions').insert({
    tanggal: data.tanggal,
    account_id: data.account_id,
    account_type: await getAccountType(supabase, data.account_id),
    transaction_type: 'CREDIT',
    reference_type: 'PAYMENT',
    reference_id: payment.id,
    debit: 0,
    credit: data.nominal,
    description: `Pembayaran hutang ${kode_payment}`,
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
    data: { id: payment.id, kode: kode_payment },
    message: `Pembayaran hutang ${kode_payment} berhasil dicatat`,
  }
}
// ============================================================
// SERVER ACTION: SELESAIKAN INDENT (Pelunasan)
// ============================================================
export async function fulfillIndentSale(saleId: string, pelunasanMethod: 'CASH' | 'TRANSFER' | 'QRIS', accountId?: string): Promise<ActionResult<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Ambil data sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(`*, sale_items(id, product_id, qty, subtotal)`)
    .eq('id', saleId)
    .single()

  if (saleError || !sale) return { success: false, error: 'Transaksi tidak ditemukan' }
  if (sale.status_transaksi !== 'INDENT') return { success: false, error: 'Transaksi bukan status INDENT' }

  // Ambil semua produk terkait untuk cek status dan FIFO
  for (const item of sale.sale_items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, status, merk, kategori, type, kode_baterai, kapasitas_ah')
      .eq('id', item.product_id)
      .single()

    if (!product) return { success: false, error: 'Produk pada nota tidak ditemukan di master data' }

    const productName = product.kategori === 'Air Aki'
      ? product.merk
      : [product.merk, product.kategori, product.type, product.kode_baterai, `${product.kapasitas_ah}AH`].filter(Boolean).join(' · ')

    if (!product.status) {
      return { success: false, error: `Produk ${productName} masih berstatus tidak aktif. Silakan aktifkan terlebih dahulu atau pastikan stoknya sudah masuk.` }
    }

    const fifoResult = await calculateFifo(item.product_id, item.qty)
    if (!fifoResult.success) {
      return { success: false, error: `Stok ${productName} kurang untuk memenuhi Inden. ${fifoResult.error}` }
    }
  }

  // Lakukan pemotongan stok dan update HPP
  for (const item of sale.sale_items) {
    const fifoResult = await calculateFifo(item.product_id, item.qty)
    if (!fifoResult.success) throw new Error('Stok kurang mendadak') // Seharusnya tidak terjadi karena sudah dicek

    await lockOpeningBalance(item.product_id)

    const hpp_fifo = fifoResult.total_hpp
    const laba_kotor = item.subtotal - hpp_fifo

    // Update sale_item dengan HPP dan laba kotor
    await supabase.from('sale_items').update({
      hpp_fifo,
      laba_kotor
    }).eq('id', item.id)

    // Insert sale_batch_allocations
    for (const alloc of fifoResult.allocations) {
      await supabase.from('sale_batch_allocations').insert({
        sale_item_id: item.id,
        batch_id: alloc.batch_id,
        qty_used: alloc.qty_used,
        harga_modal_unit: alloc.harga_modal_unit,
        subtotal_hpp: alloc.subtotal_hpp,
      })
    }

    // Kurangi qty_tersedia batch FIFO
    await applyFifoAllocations(fifoResult.allocations)

    // Catat inventory movement
    await supabase.from('inventory_movements').insert({
      product_id: item.product_id,
      movement_type: 'SALE',
      reference_id: sale.id,
      reference_type: 'SALE',
      qty_in: 0,
      qty_out: item.qty,
      transaction_date: sale.tanggal,
      keterangan: `Penyelesaian Inden ${sale.kode_penjualan}`,
    })

    // Update qty_stok produk
    const { data: currentProduct } = await supabase
      .from('products')
      .select('qty_stok')
      .eq('id', item.product_id)
      .single()

    if (currentProduct) {
      await supabase
        .from('products')
        .update({ qty_stok: Math.max(0, currentProduct.qty_stok - item.qty) })
        .eq('id', item.product_id)
    }
  }

  // Catat pelunasan kas jika ada sisa bayar
  const sisaBayar = sale.total - (sale.dp_amount ?? 0)
  if (sisaBayar > 0 && accountId) {
    await supabase.from('cash_transactions').insert({
      tanggal: sale.tanggal,
      account_id: accountId,
      account_type: await getAccountType(supabase, accountId),
      transaction_type: 'DEBIT',
      reference_type: 'SALE',
      reference_id: sale.id,
      debit: sisaBayar,
      credit: 0,
      description: `Pelunasan Inden ${sale.kode_penjualan}`,
    })
  }

  // Update header sales
  await supabase.from('sales').update({
    status_transaksi: 'PAID'
  }).eq('id', sale.id)
  revalidatePath('/penjualan')
  revalidatePath('/stok')
  revalidatePath('/dashboard')

  return { success: true, data: null, message: `Inden ${sale.kode_penjualan} berhasil diselesaikan` }
}
// ============================================================
// SERVER ACTION: INPUT HUTANG MANUAL (TANPA STOK)
// ============================================================
const CreateManualHutangSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  supplier_id: z.string().uuid('Supplier tidak valid'),
  nominal: z.number().positive('Nominal harus lebih dari 0'),
  keterangan: z.string().optional(),
})

export async function createManualHutang(input: z.infer<typeof CreateManualHutangSchema>): Promise<ActionResult<{ id: string; kode: string }>> {
  const parsed = CreateManualHutangSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const data = parsed.data

  const { data: kodeData } = await supabase.rpc('generate_kode_pembelian')
  const kode_pembelian = kodeData as string

  // Insert purchase_transaction WITHOUT items
  const { data: purchase, error: purchaseError } = await supabase
    .from('purchase_transactions')
    .insert({
      kode_pembelian,
      tanggal: data.tanggal,
      supplier_id: data.supplier_id,
      nominal: data.nominal,
      pajak: 0,
      total: data.nominal,
      status_pembayaran: 'HUTANG',
      status_transaksi: 'POSTED',
      keterangan: data.keterangan || 'Hutang Lama (Input Manual)',
      created_by: user.id,
    })
    .select()
    .single()

  if (purchaseError || !purchase) {
    return { success: false, error: purchaseError?.message ?? 'Gagal menyimpan hutang manual' }
  }

  revalidatePath('/hutang')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: { id: purchase.id, kode: kode_pembelian },
    message: `Hutang manual ${kode_pembelian} berhasil disimpan`,
  }
}

// ============================================================
// SERVER ACTION: BAYAR HUTANG BULANAN (MASSAL)
// ============================================================
const CreateBulkPaymentSchema = z.object({
  supplier_id: z.string().uuid(),
  purchases: z.array(z.object({
    purchase_id: z.string().uuid(),
    nominal: z.number().positive(),
  })).min(1),
  tanggal: z.string().min(1),
  payment_method: z.enum(['CASH', 'TRANSFER', 'QRIS', 'BRANKAS']),
  account_id: z.string().uuid().optional(),
  keterangan: z.string().optional(),
})

export async function createBulkSupplierPayment(input: any): Promise<ActionResult<null>> {
  const parsed = CreateBulkPaymentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk membayar hutang' }
  }

  const data = parsed.data

  // Total up all nominals for the cash transaction
  const totalNominal = data.purchases.reduce((sum, p) => sum + p.nominal, 0)

  // Create a single grouped description or just use a generic one
  const kode_pembayaran_bulk = `BULK-PAY-${Date.now()}`

  // Track if all went well
  for (const p of data.purchases) {
    const { data: kodeData } = await supabase.rpc('generate_kode_pembayaran')
    const kode_pembayaran = kodeData as string

    // 1. Insert ke supplier_payments
    const { data: payment, error: paymentError } = await supabase
      .from('supplier_payments')
      .insert({
        kode_pembayaran,
        supplier_id: data.supplier_id,
        purchase_id: p.purchase_id,
        tanggal: data.tanggal,
        nominal: p.nominal,
        payment_method: data.payment_method,
        keterangan: data.keterangan ? `${data.keterangan} (Bulk)` : 'Pembayaran Tagihan Bulanan',
        created_by: user.id,
      })
      .select('id, kode_pembayaran')
      .single()

    if (paymentError || !payment) {
      return { success: false, error: paymentError?.message ?? 'Gagal membuat pembayaran' }
    }

    // 2. Catat Kas Keluar untuk pembayaran ini
    await supabase.from('cash_transactions').insert({
      tanggal: data.tanggal,
      account_id: data.account_id,
      account_type: await getAccountType(supabase, data.account_id),
      transaction_type: 'CREDIT',
      reference_type: 'PAYMENT',
      reference_id: payment.id,
      debit: 0,
      credit: p.nominal,
      description: data.keterangan ? `Pembayaran tagihan supplier massal - ${data.keterangan}` : `Pembayaran hutang ${payment.kode_pembayaran}`,
    })

    // 3. Update status_pembayaran purchase_transactions
    const { data: purchase } = await supabase
      .from('purchase_transactions')
      .select('total')
      .eq('id', p.purchase_id)
      .single()

    if (purchase) {
      const { data: allPayments } = await supabase
        .from('supplier_payments')
        .select('nominal')
        .eq('purchase_id', p.purchase_id)

      const paidAmount = allPayments?.reduce((s, pay) => s + pay.nominal, 0) ?? 0

      let newStatus: 'LUNAS' | 'PARSIAL' | 'HUTANG' = 'HUTANG'
      if (paidAmount >= purchase.total) newStatus = 'LUNAS'
      else if (paidAmount > 0) newStatus = 'PARSIAL'

      await supabase
        .from('purchase_transactions')
        .update({ status_pembayaran: newStatus })
        .eq('id', p.purchase_id)
    }
  }

  revalidatePath('/hutang')
  revalidatePath('/dashboard')

  return {
    success: true,
    data: null,
    message: `Pembayaran tagihan bulanan berhasil dicatat`,
  }
}

/** Ambil harga beli terakhir per product_id dari inventory_batches */
export async function getLastPurchasePrices(productIds: string[]): Promise<Record<string, number>> {
  if (!productIds.length) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('product_id, harga_modal_unit, tanggal_masuk')
    .in('product_id', productIds)
    .order('tanggal_masuk', { ascending: false })

  if (error || !data) return {}

  // Ambil harga terakhir per product (data sudah terurut DESC, jadi ambil pertama ketemu)
  const result: Record<string, number> = {}
  for (const row of data) {
    if (!result[row.product_id]) {
      result[row.product_id] = Number(row.harga_modal_unit)
    }
  }
  return result
}
