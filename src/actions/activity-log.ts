'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getActivityLogs(
  page = 1,
  pageSize = 15,
  filters?: {
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
    entityType?: string;
  }
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi', data: [], total: 0 }

  // 2. Strict role checking
  const { data: userData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  if (!userData) {
    return { success: false, error: 'Role tidak ditemukan', data: [], total: 0 }
  }

  // Admin cannot see activity logs at all
  if (userData.role === 'ADMIN') {
    return { success: false, error: 'Anda tidak memiliki akses ke halaman ini', data: [], total: 0 }
  }

  // 3. Build query
  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
  
  if (filters?.startDate) {
    query = query.gte('created_at', new Date(filters.startDate).toISOString())
  }
  if (filters?.endDate) {
    // Add 1 day to end date to include the whole day
    const end = new Date(filters.endDate)
    end.setDate(end.getDate() + 1)
    query = query.lt('created_at', end.toISOString())
  }
  if (filters?.action) {
    query = query.eq('action', filters.action)
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  // 4. Execute with pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error("getActivityLogs error:", error)
    return { success: false, error: error.message, data: [], total: 0 }
  }

  // Manual join for users because activity_log references auth.users not public.users
  let finalData = data || []
  if (finalData.length > 0) {
    const adminClient = getAdminSupabase()
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    
    if (authUsers?.users) {
      const userMap = new Map(authUsers.users.map((u: any) => [u.id, {
        id: u.id,
        full_name: u.user_metadata?.full_name || u.email,
        email: u.email
      }]))
      finalData = finalData.map((d: any) => ({
        ...d,
        users: userMap.get(d.user_id) || null
      }))
    }
  }

  return {
    success: true,
    data: finalData,
    total: count || 0
  }
}
