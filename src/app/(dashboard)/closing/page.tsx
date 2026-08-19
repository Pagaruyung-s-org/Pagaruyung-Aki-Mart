export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ClosingClient } from './ClosingClient'

export default async function ClosingPage() {
  const supabase = await createClient()

  const { data: closings } = await supabase
    .from('daily_closings')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Tutup Buku (Closing Harian)" 
        subtitle="Kelola closing harian kasir, tarik uang ke brankas, dan kunci transaksi" 
      />
      <div className="flex-1 p-6">
        <ClosingClient closings={closings ?? []} />
      </div>
    </div>
  )
}
