import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Dapatkan daftar accounts
  const { data: accounts } = await supabase.from('accounts').select('id, name')
  if (!accounts) return NextResponse.json({ error: 'Gagal load accounts' })

  const getBankId = (nameMatch: string) => {
    const acc = accounts.find(a => a.name.toLowerCase().includes(nameMatch.toLowerCase()))
    return acc ? acc.id : accounts[0].id
  }
  const mandiriId = getBankId('mandiri')
  const bsiId = getBankId('bsi')
  const bniId = getBankId('bni')
  const kasId = getBankId('kas')
  const brankasId = getBankId('brankas')

  // Cari semua sales yang sudah VOID
  const { data: voidedSales } = await supabase.from('sales').select('id, kode_penjualan').eq('status_transaksi', 'VOID')
  
  let fixedCount = 0

  for (const sale of voidedSales || []) {
    // Cek apakah punya cash_transaction DEBIT
    const { data: debitCash } = await supabase.from('cash_transactions')
      .select('*')
      .eq('reference_id', sale.id)
      .eq('reference_type', 'SALE')
      .gt('debit', 0)
      .limit(1)
      
    // Cek apakah punya cash_transaction CREDIT (Reversal)
    const { data: creditCash } = await supabase.from('cash_transactions')
      .select('*')
      .eq('reference_id', sale.id)
      .eq('reference_type', 'SALE_REVERSAL')
      .gt('credit', 0)
      .limit(1)

    // Jika ada DEBIT tapi tidak ada CREDIT, berarti void-nya gagal membuat reversal!
    if (debitCash && debitCash.length > 0 && (!creditCash || creditCash.length === 0)) {
      const orig = debitCash[0]
      await supabase.from('cash_transactions').insert({
        tanggal: new Date().toISOString(),
        account_id: orig.account_id,
        account_type: orig.account_type,
        reference_id: sale.id,
        reference_type: 'SALE_REVERSAL',
        transaction_type: 'CREDIT',
        debit: 0,
        credit: orig.debit,
        description: 'Pembatalan penjualan ' + sale.kode_penjualan + ' (Fixed)'
      })
      fixedCount++
    }
  }

  return NextResponse.json({
    success: true,
    message: `Berhasil memperbaiki ${fixedCount} transaksi VOID yang nyangkut di buku kas!`,
  })
}
