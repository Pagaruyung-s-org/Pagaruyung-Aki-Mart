'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { ClipboardCheck, PackagePlus, Settings } from 'lucide-react'
import { OpnamePanel } from './OpnamePanel'
import { OpeningBalancePanel } from './OpeningBalancePanel'
import { updateAppSetting } from '@/actions/settings'
import { useToast } from '@/components/ui/Toast'

interface StokOpnameTabsProps {
  userRole: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null
  activeSession: any
  sessionHistory: any[]
  openingBalances: any[]
  products: any[]
  isOpeningBalanceEnabled: boolean
}

export function StokOpnameTabs({
  userRole,
  activeSession,
  sessionHistory,
  openingBalances,
  products,
  isOpeningBalanceEnabled,
}: StokOpnameTabsProps) {
  const [obEnabled, setObEnabled] = useState(isOpeningBalanceEnabled)
  const [isUpdating, setIsUpdating] = useState(false)
  const { showToast } = useToast()

  const handleToggleOb = async () => {
    setIsUpdating(true)
    const newValue = !obEnabled
    try {
      const result = await updateAppSetting('feature_opening_balance', newValue)
      if (result.success) {
        setObEnabled(newValue)
        showToast('success', `Fitur Opening Balance ${newValue ? 'diaktifkan' : 'dinonaktifkan'}`)
      } else {
        showToast('error', result.error || 'Gagal mengubah pengaturan')
      }
    } catch (e: any) {
      showToast('error', 'Terjadi kesalahan jaringan')
    } finally {
      setIsUpdating(false)
    }
  }

  const tabs = [
    { id: 'opname', label: 'Sesi Stok Opname', icon: <ClipboardCheck className="h-4 w-4" /> },
  ]

  if (obEnabled || userRole === 'SUPER_ADMIN') {
    tabs.push({ id: 'opening_balance', label: 'Opening Balance (Saldo Awal)', icon: <PackagePlus className="h-4 w-4" /> })
  }

  const contents = {
    opname: (
      <OpnamePanel
        activeSession={activeSession}
        sessionHistory={sessionHistory}
        products={products}
      />
    ),
    opening_balance: (
      <OpeningBalancePanel
        openingBalances={openingBalances}
        products={products}
        userRole={userRole}
      />
    ),
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <Tabs tabs={tabs} contents={contents} />
        
        {/* Toggle untuk Super Admin */}
        {userRole === 'SUPER_ADMIN' && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm self-start">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Fitur Opening Balance:</span>
            <button
              onClick={handleToggleOb}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                obEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  obEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
