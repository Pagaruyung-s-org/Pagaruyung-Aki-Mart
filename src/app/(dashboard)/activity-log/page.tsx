import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { ActivityLogTable } from '@/components/tables/ActivityLogTable'
import { getActivityLogs } from '@/actions/activity-log'

export const metadata = {
  title: 'Log Aktivitas | Kedai Aki',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: { page?: string, action?: string, entityType?: string, userId?: string, startDate?: string, endDate?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Cek Role
  const { data: userData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  const role = userData?.role || null

  if (role === 'ADMIN') {
    // Admin tidak boleh masuk
    redirect('/')
  }

  // Fetch semua user untuk filter dropdown (menggunakan Admin API)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const { data: roles } = await supabase.from('user_roles').select('*')
  
  const users = authUsers?.users.map(u => {
    const userRole = roles?.find(r => r.user_id === u.id)
    return {
      id: u.id,
      full_name: u.user_metadata?.full_name || u.email,
      role: userRole?.role || 'UNKNOWN'
    }
  }) || []

  // Parse query params
  const currentPage = Number(searchParams?.page) || 1
  const pageSize = 15

  const { data: logs, total, error } = await getActivityLogs(currentPage, pageSize, {
    action: searchParams.action,
    entityType: searchParams.entityType,
    userId: searchParams.userId,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate
  })

  return (
    <div>
      <Header title="Log Aktivitas Sistem" subtitle="Melihat riwayat aktivitas void dan pembatalan transaksi." />
      <div className="p-6 space-y-6">
        <ActivityLogTable 
          logs={logs} 
          totalItems={total}
          currentPage={currentPage}
          pageSize={pageSize}
          users={users || []}
        />
      </div>
    </div>
  )
}
