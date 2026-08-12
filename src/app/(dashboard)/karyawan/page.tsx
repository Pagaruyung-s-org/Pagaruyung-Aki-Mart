import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { KaryawanTable } from '@/components/tables/KaryawanTable'
import { getUserRole } from '@/actions/users'

export const dynamic = 'force-dynamic'

export default async function KaryawanPage() {
  const supabase = await createClient()

  const [role, { data: employees }] = await Promise.all([
    getUserRole(),
    supabase.from('employees').select('*').order('nama_karyawan')
  ])

  return (
    <div>
      <Header title="Master Karyawan" subtitle="Kelola data karyawan" />
      <div className="p-6">
        <KaryawanTable initial={employees ?? []} role={role} />
      </div>
    </div>
  )
}
