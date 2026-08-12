import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { FormOperasional } from '@/components/forms/FormOperasional'
import { formatRupiah, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { getUserRole } from '@/actions/users'
import { RiwayatOperasionalTable } from '@/components/tables/RiwayatOperasionalTable'

export default async function OperasionalPage() {
  const supabase = await createClient()

  const [role, { data: categories }, { data: employees }, { data: expenses }] = await Promise.all([
    getUserRole(),
    supabase.from('expense_categories').select('*').eq('status', true).order('nama_kategori'),
    supabase.from('employees').select('*').eq('status', true).order('nama_karyawan'),
    supabase.from('expenses').select(`
      *,
      expense_categories(nama_kategori),
      employees(nama_karyawan)
    `).order('tanggal', { ascending: false }).limit(50),
  ])

  return (
    <div>
      <Header title="Biaya Operasional" subtitle="Kelola pengeluaran operasional usaha" />
      <div className="p-6 space-y-6">
        {role !== 'OWNER' && (
          <FormOperasional categories={categories ?? []} employees={employees ?? []} />
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {!expenses || expenses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Belum ada data pengeluaran</div>
          ) : (
            <RiwayatOperasionalTable expenses={expenses} />
          )}
        </div>
      </div>
    </div>
  )
}
