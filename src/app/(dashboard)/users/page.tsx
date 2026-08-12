import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { UserTable } from '@/components/tables/UserTable'
import { getUserRole } from '@/actions/users'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const role = await getUserRole()
  
  if (role !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // For User management, we need to fetch both auth.users and public.user_roles
  // Since auth.users is not queryable directly by anon/service role via postgrest without a view,
  // we will fetch user_roles which has the user_id, and we can fetch auth users via Admin API or a Database View.
  // Actually, wait, it's better to fetch users using Admin API in the component, or create a View.
  // The simplest is to create a secure RPC or View, OR we can just fetch via Admin API in a server component.
  
  // Let's create an admin client in the server component.
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
  const { data: roles } = await supabase.from('user_roles').select('*')

  if (authError) {
    return <div>Error loading users: {authError.message}</div>
  }

  const users = authUsers?.users.map(u => {
    const userRole = roles?.find(r => r.user_id === u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      role: (userRole?.role ?? 'ADMIN') as 'SUPER_ADMIN' | 'ADMIN' | 'OWNER',
      created_at: u.created_at,
    }
  }) || []

  return (
    <div>
      <Header title="User Management" subtitle="Kelola pengguna dan hak akses" />
      <div className="p-6">
        <UserTable initial={users} />
      </div>
    </div>
  )
}
