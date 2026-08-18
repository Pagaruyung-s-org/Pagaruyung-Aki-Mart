import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { KategoriTable } from '@/components/tables/KategoriTable'
import { getUserRole } from '@/actions/users'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function KategoriPage() {
  const supabase = await createClient()

  const [role, { data: categories }] = await Promise.all([
    getUserRole(),
    supabase.from('expense_categories').select('*').order('nama_kategori')
  ])

  if (role === 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div>
      <Header title="Kategori Biaya" subtitle="Kelola kategori biaya operasional" />
      <div className="p-6">
        <KategoriTable categories={categories ?? []} role={role} />
      </div>
    </div>
  )
}
