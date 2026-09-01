import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { OperasionalClient } from './OperasionalClient'
import { formatRupiah, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import { getUserRole } from '@/actions/users'
import { RiwayatOperasionalTable } from '@/components/tables/RiwayatOperasionalTable'

export default async function OperasionalPage() {
  const supabase = await createClient()

  const [role, { data: categories }, { data: employees }, { data: expenses }, { data: accounts }] = await Promise.all([
    getUserRole(),
    supabase.from('expense_categories').select('*').eq('status', true).order('nama_kategori').order('id', { ascending: true }),
    supabase.from('employees').select('*').eq('status', true).order('nama_karyawan').order('id', { ascending: true }),
    supabase.from('expenses').select(`
      *,
      expense_categories(nama_kategori),
      employees(nama_karyawan)
    `).order('tanggal', { ascending: false }).order('created_at', { ascending: false }).limit(50),
    supabase.from('accounts').select('id, name, type').eq('is_active', true).order('sort_order', { ascending: true })
  ])

  return (
    <div>
      <Header title="Biaya Operasional" subtitle="Kelola pengeluaran operasional usaha" />
      <div className="p-6 space-y-6">
        <OperasionalClient categories={categories ?? []} employees={employees ?? []} accounts={accounts || []} role={role || ''} />

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
