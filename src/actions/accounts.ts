'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Account } from '@/types/database'

// ============================================================
// SCHEMA VALIDASI ZOD
// ============================================================

const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Nama akun wajib diisi'),
  type: z.enum(['KAS', 'BANK', 'BRANKAS']),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
})

type ActionResult<T = null> =
  | { success: true; data: T; message: string }
  | { success: false; error: string }

// ============================================================
// 1. GET ALL ACCOUNTS
// ============================================================
export async function getAccounts(activeOnly = true): Promise<Account[]> {
  const supabase = await createClient()

  let query = supabase.from('accounts').select('*').order('sort_order', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data } = await query

  return (data as Account[]) || []
}

// ============================================================
// 2. CREATE ACCOUNT
// ============================================================
export async function createAccount(input: z.infer<typeof CreateAccountSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateAccountSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Cek role — hanya Owner/Super Admin
  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk menambah akun' }
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/kas')
  revalidatePath('/kas/akun')
  revalidatePath('/dashboard')

  return { success: true, data: { id: data.id }, message: `Akun ${parsed.data.name} berhasil dibuat` }
}

// ============================================================
// 3. UPDATE ACCOUNT
// ============================================================
export async function updateAccount(id: string, input: Partial<z.infer<typeof CreateAccountSchema>>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleData?.role === 'ADMIN') {
    return { success: false, error: 'Admin tidak memiliki akses untuk mengubah akun' }
  }

  const { error } = await supabase
    .from('accounts')
    .update(input)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/kas')
  revalidatePath('/kas/akun')
  revalidatePath('/dashboard')

  return { success: true, data: null, message: 'Akun berhasil diperbarui' }
}

// ============================================================
// 4. TOGGLE ACTIVE STATUS
// ============================================================
export async function toggleAccountActive(id: string, isActive: boolean): Promise<ActionResult> {
  return updateAccount(id, { is_active: isActive })
}
