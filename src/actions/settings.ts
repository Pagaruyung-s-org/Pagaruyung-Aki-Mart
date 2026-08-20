'use server'

import { createClient } from '@/lib/supabase/server'

// ============================================================
// SERVER ACTION: APP SETTINGS
// ============================================================

/**
 * Ambil nilai setting berdasarkan key
 */
export async function getAppSetting(key: string): Promise<any> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  return data?.value ?? null
}

/**
 * Update nilai setting (hanya SUPER_ADMIN)
 */
export async function updateAppSetting(
  key: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Tidak terautentikasi' }

  // Cek role — hanya SUPER_ADMIN
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Hanya Super Admin yang bisa mengubah pengaturan' }
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert({
      key,
      value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
