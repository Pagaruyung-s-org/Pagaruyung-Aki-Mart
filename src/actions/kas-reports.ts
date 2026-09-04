'use server'

import { createClient } from '@/lib/supabase/server'

export async function getIncomingSalesFiltered(startDate: string, endDate: string) {
  try {
    const supabase = await createClient()

    // Add time component to cover the entire day if not provided
    const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
    const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`

    const { data: txs, error } = await supabase
      .from('cash_transactions')
      .select('account_id, reference_type, debit, credit, accounts(name)')
      .gte('tanggal', start)
      .lte('tanggal', end)
      .in('reference_type', ['SALE', 'SALE_REVERSAL'])

    if (error) {
      return { success: false, error: error.message }
    }

    const grouped: Record<string, { accountId: string, accountName: string, masuk: number, batal: number, net: number }> = {}

    txs?.forEach(tx => {
      const accId = tx.account_id
      if (!accId) return
      if (!grouped[accId]) {
        grouped[accId] = {
          accountId: accId,
          accountName: (tx.accounts as any)?.name || 'Unknown',
          masuk: 0,
          batal: 0,
          net: 0
        }
      }

      if (tx.reference_type === 'SALE' && tx.debit > 0) {
        grouped[accId].masuk += tx.debit
      } else if (tx.reference_type === 'SALE_REVERSAL' && tx.credit > 0) {
        grouped[accId].batal += tx.credit
      }

      grouped[accId].net = grouped[accId].masuk - grouped[accId].batal
    })

    return {
      success: true,
      data: Object.values(grouped).sort((a, b) => b.net - a.net)
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}
