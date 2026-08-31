'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type ActionResult<T = null> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string }

const isSameDay = (d1: string, d2: string) => {
  if (!d1 || !d2) return false;
  return new Date(d1).toISOString().split('T')[0] === new Date(d2).toISOString().split('T')[0]
}

// Helper: cek apakah tanggal sudah di-closing (SUBMITTED)
async function checkClosedDate(supabase: any, tanggal: string): Promise<boolean> {
  const dateOnly = new Date(tanggal).toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_closings')
    .select('status')
    .eq('tanggal', dateOnly)
    .eq('status', 'SUBMITTED')
    .maybeSingle()
  return !!data
}

export async function voidSale(id: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Check role
  const { data: userData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  const role = userData?.role

  // Fetch sale
  const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single()
  if (!sale) return { success: false, error: 'Data penjualan tidak ditemukan' }
  if (sale.status_transaksi === 'VOID' || sale.status_transaksi === 'REVERSAL') {
    return { success: false, error: 'Transaksi sudah berstatus Void atau Reversal' }
  }

  // Cek apakah tanggal transaksi sudah di-closing
  const isClosed = await checkClosedDate(supabase, sale.tanggal)
  if (isClosed && role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Transaksi tidak dapat di-void karena tanggal ini sudah di-closing (dikunci)' }
  }

  if (role === 'ADMIN') {
    const today = new Date().toISOString()
    if (!isSameDay(sale.tanggal, today)) {
      return { success: false, error: 'Hanya dapat membatalkan transaksi pada hari yang sama (Hari H)' }
    }
  } else if (role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Anda tidak memiliki akses untuk membatalkan transaksi' }
  }

  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Alasan pembatalan wajib diisi' }
  }

  const isIndent = sale.status_transaksi === 'INDENT'

  // 1. Mark original as VOID
  const { error: voidError } = await supabase.from('sales').update({
    status_transaksi: isIndent ? 'VOID INDENT' : 'VOID',
    void_reason: reason,
    void_by: user.id,
    void_at: new Date().toISOString()
  }).eq('id', id)

  if (voidError) return { success: false, error: voidError.message }

  if (isIndent) {
    if ((sale.dp_amount || 0) > 0) {
      const { data: originalCashes } = await supabase
        .from('cash_transactions')
        .select('account_id, account_type, debit')
        .eq('reference_id', sale.id)
        .eq('reference_type', 'SALE')

      if (originalCashes && originalCashes.length > 0) {
        for (const cash of originalCashes) {
          await supabase.from('cash_transactions').insert({
            tanggal: new Date().toISOString(),
            account_id: cash.account_id,
            account_type: cash.account_type,
            transaction_type: 'CREDIT',
            reference_type: 'SALE_REVERSAL',
            reference_id: sale.id,
            debit: 0,
            credit: cash.debit,
            description: 'Refund DP pembatalan inden ' + sale.kode_penjualan
          })
        }
      }
    }

    revalidatePath('/penjualan')
    revalidatePath('/stok')
    revalidatePath('/stok/air-aki')
    revalidatePath('/dashboard')

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'void_penjualan',
      entity_type: 'sales',
      entity_id: id,
      old_value: sale,
      reason: reason
    })

    return { success: true, message: `Inden ${sale.kode_penjualan} berhasil dibatalkan` }
  }

  // 2. Create Reversal
  const { data: reversalSale, error: revError } = await supabase.from('sales').insert({
    kode_penjualan: sale.kode_penjualan + '-REV',
    tanggal: sale.tanggal,
    customer_name: sale.customer_name,
    subtotal: -sale.subtotal,
    discount: -sale.discount,
    total: -sale.total,
    payment_method: sale.payment_method,
    status_transaksi: 'REVERSAL',
    keterangan: 'Reversal dari ' + sale.kode_penjualan,
    created_by: user.id,
    include_air_aki: sale.include_air_aki,
    jumlah_air_aki: -sale.jumlah_air_aki,
    harga_jual_air_aki: sale.harga_jual_air_aki,
    hpp_air_aki: -sale.hpp_air_aki,
    laba_air_aki: -sale.laba_air_aki
  }).select('id').single()

  if (revError || !reversalSale) return { success: false, error: 'Gagal membuat transaksi reversal: ' + (revError?.message || '') }

  // Restore inventory batches
  const { data: saleItems } = await supabase
    .from('sale_items')
    .select('*, sale_batch_allocations(*)')
    .eq('sale_id', id)

  if (saleItems) {
    for (const item of saleItems) {
      // restore batches
      for (const alloc of item.sale_batch_allocations || []) {
        const { data: batch } = await supabase.from('inventory_batches').select('qty_tersedia').eq('id', alloc.batch_id).single()
        if (batch) {
          await supabase.from('inventory_batches').update({
            qty_tersedia: batch.qty_tersedia + alloc.qty_used
          }).eq('id', alloc.batch_id)
        }
      }

      // restore product stock
      const { data: product } = await supabase.from('products').select('qty_stok').eq('id', item.product_id).single()
      if (product) {
        await supabase.from('products').update({
          qty_stok: product.qty_stok + item.qty
        }).eq('id', item.product_id)
      }

      // Add to reversal sale items
      await supabase.from('sale_items').insert({
        sale_id: reversalSale.id,
        product_id: item.product_id,
        qty: -item.qty,
        harga_jual: item.harga_jual,
        subtotal: -item.subtotal,
        hpp_fifo: -item.hpp_fifo,
        laba_kotor: -item.laba_kotor
      })
    }
  }

  // Create Reversal Cash transaction
  const { data: originalCashes } = await supabase
    .from('cash_transactions')
    .select('account_id, account_type, debit')
    .eq('reference_id', sale.id)
    .eq('reference_type', 'SALE')

  if (originalCashes && originalCashes.length > 0) {
    for (const cash of originalCashes) {
      await supabase.from('cash_transactions').insert({
        tanggal: new Date().toISOString(),
        account_id: cash.account_id,
        account_type: cash.account_type,
        reference_id: reversalSale.id,
        reference_type: 'SALE_REVERSAL',
        transaction_type: 'CREDIT', // reversal of sale is money out
        debit: 0,
        credit: cash.debit,
        description: 'Pembatalan penjualan ' + sale.kode_penjualan
      })
    }
  }

  // Create Reversal Inventory movements
  if (saleItems) {
    for (const item of saleItems) {
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'SALE_RETURN',
        qty_in: item.qty,
        qty_out: 0,
        reference_id: reversalSale.id,
        reference_type: 'SALE_REVERSAL',
        keterangan: 'Pembatalan penjualan ' + sale.kode_penjualan
      })
    }
  }

  revalidatePath('/penjualan')
  revalidatePath('/stok')
  revalidatePath('/stok/air-aki')
  revalidatePath('/dashboard')

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'void_penjualan',
    entity_type: 'sales',
    entity_id: id,
    old_value: sale,
    reason: reason
  })

  return { success: true, message: `Penjualan ${sale.kode_penjualan} berhasil dibatalkan` }
}

export async function voidPurchase(id: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Check role
  const { data: userData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  const role = userData?.role

  // Fetch purchase
  const { data: purchase } = await supabase.from('purchase_transactions').select('*').eq('id', id).single()
  if (!purchase) return { success: false, error: 'Data pembelian tidak ditemukan' }
  if (purchase.status_transaksi === 'VOID' || purchase.status_transaksi === 'REVERSAL') {
    return { success: false, error: 'Transaksi sudah berstatus Void atau Reversal' }
  }

  // Cek apakah tanggal transaksi sudah di-closing
  const isPurchaseClosed = await checkClosedDate(supabase, purchase.tanggal)
  if (isPurchaseClosed && role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Transaksi tidak dapat di-void karena tanggal ini sudah di-closing (dikunci)' }
  }

  if (role === 'ADMIN') {
    const today = new Date().toISOString()
    if (!isSameDay(purchase.tanggal, today)) {
      return { success: false, error: 'Hanya dapat membatalkan transaksi pada hari yang sama (Hari H)' }
    }
  } else if (role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Anda tidak memiliki akses untuk membatalkan transaksi' }
  }

  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Alasan pembatalan wajib diisi' }
  }

  // Check if any items have been sold
  const { data: purchaseItems } = await supabase.from('purchase_items').select('*').eq('purchase_id', id)

  if (purchaseItems) {
    for (const item of purchaseItems) {
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('id, qty_awal, qty_tersedia')
        .eq('product_id', item.product_id)
        .eq('harga_modal_unit', item.harga_modal_unit)
        .limit(1)

      const batch = batches?.[0]
      if (batch) {
        if (batch.qty_tersedia < item.qty) {
          return { success: false, error: `Gagal membatalkan: Barang dari faktur ini sudah ada yang terjual. Harap batalkan penjualan terkait dahulu.` }
        }
      }
    }
  }

  // Check if there are active payments
  const { data: activePayments } = await supabase
    .from('supplier_payments')
    .select('id')
    .eq('purchase_id', id)
    .eq('status_transaksi', 'PAID')
    .limit(1)

  if (activePayments && activePayments.length > 0) {
    return { success: false, error: 'Gagal membatalkan: Terdapat pembayaran hutang aktif untuk faktur ini. Harap batalkan riwayat pembayarannya terlebih dahulu.' }
  }

  // 1. Mark original as VOID
  const { error: voidError } = await supabase.from('purchase_transactions').update({
    status_transaksi: 'VOID',
    void_reason: reason,
    void_by: user.id,
    void_at: new Date().toISOString()
  }).eq('id', id)

  if (voidError) return { success: false, error: voidError.message }

  // 2. Create Reversal
  const { data: reversalPurchase, error: revError } = await supabase.from('purchase_transactions').insert({
    kode_pembelian: purchase.kode_pembelian + '-REV',
    tanggal: purchase.tanggal,
    supplier_id: purchase.supplier_id,
    nominal: -purchase.nominal,
    pajak: -purchase.pajak,
    total: -purchase.total,
    status_pembayaran: purchase.status_pembayaran,
    status_transaksi: 'REVERSAL',
    keterangan: 'Reversal dari ' + purchase.kode_pembelian,
    created_by: user.id
  }).select('id').single()

  if (revError || !reversalPurchase) return { success: false, error: 'Gagal membuat transaksi reversal: ' + (revError?.message || '') }

  // Adjust safely
  if (purchaseItems) {
    for (const item of purchaseItems) {
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('id, qty_awal, qty_tersedia')
        .eq('product_id', item.product_id)
        .eq('harga_modal_unit', item.harga_modal_unit)
        .limit(1)

      const batch = batches?.[0]
      if (batch) {
        const newQtyAwal = batch.qty_awal - item.qty
        const newQtyTersedia = batch.qty_tersedia - item.qty

        await supabase.from('inventory_batches').update({
          qty_awal: newQtyAwal,
          qty_tersedia: newQtyTersedia
        }).eq('id', batch.id)

        // Decrease product stock
        const { data: product } = await supabase.from('products').select('qty_stok').eq('id', item.product_id).single()
        if (product) {
          await supabase.from('products').update({
            qty_stok: product.qty_stok - item.qty
          }).eq('id', item.product_id)
        }
      }

      await supabase.from('purchase_items').insert({
        purchase_id: reversalPurchase.id,
        product_id: item.product_id,
        qty: -item.qty,
        harga_modal_unit: item.harga_modal_unit,
        subtotal: -item.subtotal
      })

      // Add Reversal Movement
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'PURCHASE_RETURN',
        qty_in: 0,
        qty_out: item.qty,
        reference_id: reversalPurchase.id,
        reference_type: 'PURCHASE_REVERSAL',
        keterangan: 'Pembatalan pembelian ' + purchase.kode_pembelian
      })
    }
  }

  // 4. Reverse cash transaction if it exists
  const { data: originalCashes } = await supabase
    .from('cash_transactions')
    .select('account_id, account_type, credit')
    .eq('reference_id', id)
    .eq('reference_type', 'PURCHASE')

  if (originalCashes && originalCashes.length > 0) {
    for (const cash of originalCashes) {
      await supabase.from('cash_transactions').insert({
        tanggal: new Date().toISOString(),
        account_id: cash.account_id,
        account_type: cash.account_type,
        reference_id: reversalPurchase.id,
        reference_type: 'PURCHASE_REVERSAL',
        transaction_type: 'DEBIT',
        debit: cash.credit, // Refund exactly what was paid out
        credit: 0,
        description: 'Pembatalan pembelian ' + purchase.kode_pembelian
      })
    }
  }

  revalidatePath('/pembelian')
  revalidatePath('/stok')
  revalidatePath('/stok/air-aki')
  revalidatePath('/dashboard')

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'void_pembelian',
    entity_type: 'purchase_transactions',
    entity_id: id,
    old_value: purchase,
    reason: reason
  })

  return { success: true, message: `Pembelian ${purchase.kode_pembelian} berhasil dibatalkan` }
}

export async function voidExpense(id: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Check role
  const { data: userData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  const role = userData?.role

  // Fetch expense
  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).single()
  if (!expense) return { success: false, error: 'Data pengeluaran tidak ditemukan' }
  if (expense.status_transaksi === 'VOID' || expense.status_transaksi === 'REVERSAL') {
    return { success: false, error: 'Transaksi sudah berstatus Void atau Reversal' }
  }

  // Cek apakah tanggal transaksi sudah di-closing
  const isExpenseClosed = await checkClosedDate(supabase, expense.tanggal)
  if (isExpenseClosed && role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Transaksi tidak dapat di-void karena tanggal ini sudah di-closing (dikunci)' }
  }

  if (role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk membatalkan pengeluaran operasional' }
  } else if (role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Anda tidak memiliki akses untuk membatalkan transaksi' }
  }

  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Alasan pembatalan wajib diisi' }
  }

  // 1. Mark original as VOID
  const { error: voidError } = await supabase.from('expenses').update({
    status_transaksi: 'VOID',
    void_reason: reason,
    void_by: user.id,
    void_at: new Date().toISOString()
  }).eq('id', id)

  if (voidError) return { success: false, error: voidError.message }

  // 2. Create Reversal
  const { data: reversalExpense, error: revError } = await supabase.from('expenses').insert({
    kode_pengeluaran: expense.kode_pengeluaran + '-REV',
    tanggal: expense.tanggal,
    category_id: expense.category_id,
    employee_id: expense.employee_id,
    nominal: -expense.nominal,
    payment_method: expense.payment_method,
    status_transaksi: 'REVERSAL',
    keterangan: 'Reversal dari ' + expense.kode_pengeluaran,
    created_by: user.id
  }).select('id').single()

  if (revError || !reversalExpense) return { success: false, error: 'Gagal membuat transaksi reversal: ' + (revError?.message || '') }

  // Create Reversal Cash transaction
  const { data: originalCashes } = await supabase
    .from('cash_transactions')
    .select('account_id, account_type, credit')
    .eq('reference_id', id)
    .eq('reference_type', 'EXPENSE')

  if (originalCashes && originalCashes.length > 0) {
    for (const cash of originalCashes) {
      await supabase.from('cash_transactions').insert({
        tanggal: new Date().toISOString(),
        account_id: cash.account_id,
        account_type: cash.account_type,
        reference_id: reversalExpense.id,
        reference_type: 'EXPENSE_REVERSAL',
        transaction_type: 'DEBIT', // reversal of expense is money in
        debit: cash.credit,
        credit: 0,
        description: 'Pembatalan pengeluaran ' + expense.kode_pengeluaran
      })
    }
  }

  revalidatePath('/operasional')
  revalidatePath('/dashboard')

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'void_operasional',
    entity_type: 'operational_expenses',
    entity_id: id,
    old_value: expense,
    reason: reason
  })

  return { success: true, message: `Pengeluaran ${expense.kode_pengeluaran} berhasil dibatalkan` }
}

// ============================================================
// VOID SUPPLIER PAYMENT
// ============================================================
export async function voidSupplierPayment(id: string, reason: string): Promise<{ success: boolean, error?: string, message?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Check role
  const { data: userData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  const role = userData?.role

  // Fetch payment
  const { data: payment } = await supabase.from('supplier_payments').select('*').eq('id', id).single()

  if (!payment) {
    return { success: false, error: 'Transaksi tidak ditemukan' }
  }

  if (payment.status_transaksi === 'VOID' || payment.status_transaksi === 'REVERSAL') {
    return { success: false, error: 'Transaksi sudah berstatus Void atau Reversal' }
  }

  // Cek apakah tanggal transaksi sudah di-closing
  const isPaymentClosed = await checkClosedDate(supabase, payment.tanggal)
  if (isPaymentClosed && role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Transaksi tidak dapat di-void karena tanggal ini sudah di-closing (dikunci)' }
  }

  if (role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk membatalkan pembayaran hutang' }
  } else if (role !== 'SUPER_ADMIN' && role !== 'OWNER') {
    return { success: false, error: 'Anda tidak memiliki akses untuk membatalkan transaksi' }
  }

  // Use admin client because supplier_payments might be missing UPDATE policy in RLS
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Mark original as VOID
  const { error: voidError } = await supabaseAdmin.from('supplier_payments').update({
    status_transaksi: 'VOID',
    void_reason: reason,
    void_by: user.id,
    void_at: new Date().toISOString()
  }).eq('id', id)

  if (voidError) return { success: false, error: voidError.message }

  // 2. Create Reversal
  const { data: reversalPayment, error: revError } = await supabase.from('supplier_payments').insert({
    kode_pembayaran: payment.kode_pembayaran + '-REV',
    supplier_id: payment.supplier_id,
    purchase_id: payment.purchase_id,
    tanggal: payment.tanggal,
    nominal: -payment.nominal,
    payment_method: payment.payment_method,
    status_transaksi: 'REVERSAL',
    keterangan: 'Reversal dari ' + payment.kode_pembayaran,
    created_by: user.id
  }).select('id').single()

  if (revError || !reversalPayment) return { success: false, error: 'Gagal membuat transaksi reversal: ' + (revError?.message || '') }

  // 3. Re-calculate purchase payment status
  if (payment.purchase_id) {
    const { data: purchase } = await supabase
      .from('purchase_transactions')
      .select('total')
      .eq('id', payment.purchase_id)
      .single()

    if (purchase) {
      const { data: totalPaid } = await supabase
        .from('supplier_payments')
        .select('nominal')
        .eq('purchase_id', payment.purchase_id)
      // Only sum non-voids, wait, reversal nominal is negative, so it cancels out the voided one!
      // So we can just sum ALL nominals for this purchase.

      const paidAmount = totalPaid?.reduce((s, p) => s + p.nominal, 0) ?? 0

      let newStatus: 'LUNAS' | 'PARSIAL' | 'HUTANG' = 'HUTANG'
      if (paidAmount >= purchase.total) newStatus = 'LUNAS'
      else if (paidAmount > 0) newStatus = 'PARSIAL'

      await supabase
        .from('purchase_transactions')
        .update({ status_pembayaran: newStatus })
        .eq('id', payment.purchase_id)
    }
  }

  // 4. Create Reversal Cash transaction
  let { data: originalCashes } = await supabase
    .from('cash_transactions')
    .select('account_id, account_type, credit')
    .eq('reference_id', id)
    .eq('reference_type', 'PAYMENT')

  if (!originalCashes || originalCashes.length === 0) {
    // Fallback for old bulk payments where reference_id was null
    const { data: fallbackAccount } = await supabase.from('accounts').select('id, type').eq('type', 'KAS').limit(1).single()
    if (fallbackAccount) {
      originalCashes = [{ account_id: fallbackAccount.id, account_type: fallbackAccount.type, credit: payment.nominal }]
    }
  }

  if (originalCashes && originalCashes.length > 0) {
    for (const cash of originalCashes) {
      await supabase.from('cash_transactions').insert({
        tanggal: new Date().toISOString(),
        account_id: cash.account_id,
        account_type: cash.account_type,
        transaction_type: 'DEBIT',
        reference_type: 'PAYMENT_REVERSAL', // Use a distinct reversal type
        reference_id: reversalPayment.id,
        debit: cash.credit,
        credit: 0,
        description: 'Reversal pembayaran hutang ' + payment.kode_pembayaran
      })
    }
  }

  revalidatePath('/hutang/bayar')
  revalidatePath('/laporan/hutang')
  revalidatePath('/dashboard')

  // Log activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'void_pembayaran_hutang',
    entity_type: 'supplier_payments',
    entity_id: id,
    old_value: payment,
    reason: reason
  })

  return { success: true, message: 'Pembayaran hutang berhasil dibatalkan (Reversal)' }
}

