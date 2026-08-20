export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { getUserRole } from '@/actions/users'
import { StokOpnameTabs } from './StokOpnameTabs'
import { getAppSetting } from '@/actions/settings'
import { getActiveSession, getSessionHistory } from '@/actions/stok-opname'
import { getOpeningBalances } from '@/actions/opening-balance'

export default async function StokOpnamePage() {
  const role = await getUserRole()
  const supabase = await createClient()

  // 1. Fetch Setting Opening Balance
  let isOpeningBalanceEnabled = true
  const setting = await getAppSetting('feature_opening_balance')
  if (setting !== null) {
    isOpeningBalanceEnabled = setting === true || setting === 'true'
  }

  // 2. Fetch Data Sesi Opname
  const activeSession = await getActiveSession()
  const sessionHistory = await getSessionHistory()

  // 3. Fetch Data Opening Balance
  const openingBalances = await getOpeningBalances()

  // 4. Fetch Master Products
  const { data: products } = await supabase
    .from('products')
    .select('id, kode_produk, merk, kategori, type, kode_baterai, kapasitas_ah, qty_stok, harga_jual, status')
    .eq('status', true)
    .order('merk')
    .order('kategori')

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header
        title="Stok Opname & Saldo Awal"
        subtitle="Sesuaikan stok fisik gudang atau input saldo awal migrasi"
      />
      <div className="p-6 overflow-y-auto">
        <StokOpnameTabs
          userRole={role}
          activeSession={activeSession}
          sessionHistory={sessionHistory}
          openingBalances={openingBalances}
          products={products ?? []}
          isOpeningBalanceEnabled={isOpeningBalanceEnabled}
        />
      </div>
    </div>
  )
}
