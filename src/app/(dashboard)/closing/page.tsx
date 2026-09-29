export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ClosingClient } from './ClosingClient'

export default async function ClosingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: closings },
    { data: bankAccounts },
    { data: brankasLedger },
    { data: roleData },
  ] = await Promise.all([
    supabase
      .from('daily_closings')
      .select('*')
      .order('tanggal', { ascending: false })
      .limit(50),
    supabase
      .from('accounts')
      .select('id, name, type, is_active')
      .eq('is_active', true)
      .eq('type', 'BANK')
      .order('sort_order', { ascending: true }),
    supabase
      .from('cash_transactions')
      .select('debit, credit')
      .eq('account_type', 'BRANKAS'),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id ?? '')
      .maybeSingle(),
  ])

  const saldoBrankas = (brankasLedger ?? []).reduce(
    (sum, r) => sum + (r.debit || 0) - (r.credit || 0),
    0
  )

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Tutup Buku (Closing Harian)" 
        subtitle="Kelola closing harian kasir, tarik uang ke brankas, dan kunci transaksi" 
      />
      <div className="flex-1 p-6">
        <ClosingClient 
          closings={closings ?? []} 
          accounts={bankAccounts ?? []} 
          saldoBrankas={saldoBrankas}
          role={roleData?.role ?? null}
        />
      </div>
    </div>
  )
}
