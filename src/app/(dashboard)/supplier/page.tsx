import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { SupplierTable } from '@/components/tables/SupplierTable'
import { getUserRole } from '@/actions/users'

export const dynamic = 'force-dynamic'

export default async function SupplierPage() {
  const supabase = await createClient()

  const [role, { data: suppliers }] = await Promise.all([
    getUserRole(),
    supabase.from('suppliers').select('*').order('nama_supplier', { ascending: true })
  ])

  return (
    <div>
      <Header title="Master Supplier" subtitle="Kelola data distributor dan supplier" />
      <div className="p-6">
        <SupplierTable initial={suppliers ?? []} role={role} />
      </div>
    </div>
  )
}
