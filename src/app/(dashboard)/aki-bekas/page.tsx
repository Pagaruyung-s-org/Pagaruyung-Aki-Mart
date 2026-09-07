import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AkiBekasClient } from './AkiBekasClient'
import { getUserRole } from '@/actions/users'
import { getAkiBekasCategories, getAkiBekasSummary, getBankAkiBalance } from '@/actions/aki-bekas'

export default async function AkiBekasPage() {
  const supabase = await createClient()
  const role = await getUserRole()

  const balance = await getBankAkiBalance()
  const categories = await getAkiBekasCategories()
  const summary = await getAkiBekasSummary()

  const { data: purchases } = await supabase
    .from('aki_bekas_purchases')
    .select('*, sales(kode_penjualan)')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: sales } = await supabase
    .from('aki_bekas_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: bankTransactions } = await supabase
    .from('bank_aki_bekas_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <Header title="Aki Bekas" subtitle="Mutasi & Transaksi aki bekas" />
      <div className="p-6">
        <AkiBekasClient
          initialBalance={balance}
          categories={categories || []}
          summary={summary || []}
          purchases={purchases || []}
          sales={sales || []}
          bankTransactions={bankTransactions || []}
          role={role ?? undefined}
        />
      </div>
    </div>
  )
}
