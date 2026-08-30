export const dynamic = 'force-dynamic'

import { Header } from '@/components/layout/Header'
import { getUserRole } from '@/actions/users'
import { getAccounts } from '@/actions/accounts'
import { redirect } from 'next/navigation'
import { AkunClient } from './AkunClient'

export default async function KasAkunPage() {
  const role = await getUserRole()
  if (role === 'ADMIN') {
    redirect('/dashboard') // Admin tidak boleh kelola akun
  }

  const accounts = await getAccounts(false) // Fetch semua termasuk yg tidak aktif

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Manajemen Akun Keuangan" 
        subtitle="Kelola rekening bank, kas, dan brankas yang digunakan untuk transaksi" 
      />
      <div className="flex-1 p-6">
        <AkunClient initialAccounts={accounts} />
      </div>
    </div>
  )
}
