'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { cache } from 'react'

// Server Client with Service Role Key for Admin API access
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Get the role of the currently logged-in user
 * Wrapped in cache() to prevent redundant DB calls during the same request lifecycle
 */
export const getUserRole = cache(async () => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return null

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  return roleData?.role as 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null
})

const UserSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OWNER'], {
    message: 'Role tidak valid'
  }),
})

export async function createUser(formData: FormData) {
  const currentRole = await getUserRole()
  if (currentRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Hanya Super Admin yang bisa menambah pengguna' }
  }

  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    role: formData.get('role') as string,
  }

  const parsed = UserSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const adminAuthClient = getAdminSupabase().auth

  // 1. Create user in auth.users
  const { data: authData, error: authError } = await adminAuthClient.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })

  if (authError) return { success: false, error: authError.message }
  if (!authData.user) return { success: false, error: 'Gagal membuat user' }

  // 2. Insert into user_roles
  const { error: roleError } = await getAdminSupabase()
    .from('user_roles')
    .upsert({ user_id: authData.user.id, role: parsed.data.role }, { onConflict: 'user_id' })

  if (roleError) {
    await adminAuthClient.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Gagal menetapkan hak akses: ' + roleError.message }
  }

  revalidatePath('/users')
  return { success: true, message: 'Pengguna berhasil dibuat' }
}

export async function updateUserRoleAndPass(userId: string, formData: FormData) {
  const currentRole = await getUserRole()
  if (currentRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Hanya Super Admin yang bisa mengedit pengguna' }
  }

  const role = formData.get('role') as string
  const password = formData.get('password') as string

  if (role && !['SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(role)) {
    return { success: false, error: 'Role tidak valid' }
  }

  const adminAuthClient = getAdminSupabase().auth

  if (password && password.length > 0) {
    if (password.length < 6) return { success: false, error: 'Password minimal 6 karakter' }
    
    const { error: passError } = await adminAuthClient.admin.updateUserById(userId, {
      password: password,
    })
    if (passError) return { success: false, error: passError.message }
  }

  if (role) {
    const { error: roleError } = await getAdminSupabase()
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId)

    if (roleError) return { success: false, error: roleError.message }
  }

  revalidatePath('/users')
  return { success: true, message: 'Pengguna berhasil diperbarui' }
}

export async function deleteUser(userId: string) {
  const currentRole = await getUserRole()
  if (currentRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Hanya Super Admin yang bisa menghapus pengguna' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    return { success: false, error: 'Tidak bisa menghapus akun Anda sendiri' }
  }

  const adminAuthClient = getAdminSupabase().auth
  const { error } = await adminAuthClient.admin.deleteUser(userId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/users')
  return { success: true, message: 'Pengguna berhasil dihapus' }
}
