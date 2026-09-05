export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah } from '@/lib/utils'
import { WalletCards, Landmark, CreditCard, ArrowRightLeft, Vault, QrCode, Banknote } from 'lucide-react'
import Link from 'next/link'
import { RiwayatKasTable } from '@/components/tables/RiwayatKasTable'
import { MutasiKasButton } from '@/components/forms/MutasiKasButton'
import { IncomingSalesFilterCard } from '@/components/dashboard/IncomingSalesFilterCard'

const accountIcons: Record<string, React.ReactNode> = {
  KAS:     <WalletCards className="h-5 w-5" />,
  BRANKAS: <Vault className="h-5 w-5" />,
  BANK:    <Landmark className="h-5 w-5" />,
  OWNER:   <Banknote className="h-5 w-5" />,
}

const accountColors: Record<string, { bg: string; text: string; icon: string }> = {
  KAS:     { bg: 'bg-amber-50',    text: 'text-amber-600',    icon: 'text-amber-600' },
  BRANKAS: { bg: 'bg-emerald-50',  text: 'text-emerald-600',  icon: 'text-emerald-600' },
  BANK:    { bg: 'bg-blue-50',     text: 'text-blue-600',     icon: 'text-blue-600' },
  OWNER:   { bg: 'bg-purple-50',   text: 'text-purple-600',   icon: 'text-purple-600' },
}

function getIcon(acc: { type: string; name: string }) {
  if (acc.name.toUpperCase().includes('QRIS') || acc.name.toUpperCase().includes('BSI')) {
    return <QrCode className="h-5 w-5" />
  }
  return accountIcons[acc.type] ?? <CreditCard className="h-5 w-5" />
}

// Role yang bisa lihat semua akun (termasuk BANK)
const PRIVILEGED_ROLES = ['OWNER', 'SUPER_ADMIN']

export default async function KasBankPage() {
  const supabase = await createClient()

  // 1. Get current user role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user?.id ?? '')
    .single()
  const role = (roleData?.role as string) ?? 'ADMIN'
  const isPrivileged = PRIVILEGED_ROLES.includes(role)

  // 2. Fetch accounts
  const { data: allAccounts } = await supabase
    .from('accounts')
    .select('id, name, type')
    .order('sort_order')

  // 3. Filter visible accounts per role
  // Admin: hanya KAS, BRANKAS, OWNER
  const visibleAccounts = isPrivileged
    ? allAccounts ?? []
    : (allAccounts ?? []).filter(a => a.type !== 'BANK')

  // 4. Fetch all cash_transactions for saldo calc
  const { data: allCash } = await supabase
    .from('cash_transactions')
    .select('account_id, debit, credit')

  // 5. Calculate saldo per account
  const saldoMap: Record<string, number> = {}
  allCash?.forEach(tx => {
    if (!tx.account_id) return
    saldoMap[tx.account_id] = (saldoMap[tx.account_id] ?? 0) + (tx.debit - tx.credit)
  })

  // Total saldo: only over visible accounts for admin, all for privileged
  const totalSaldo = visibleAccounts.reduce((sum, acc) => sum + (saldoMap[acc.id] ?? 0), 0)

  // 6. Fetch Recent Transactions (last 50)
  const { data: recentTransactions } = await supabase
    .from('cash_transactions')
    .select('*, accounts(name)')
    .order('tanggal', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header 
        title="Kas & Bank" 
        subtitle="Posisi saldo riil dan riwayat transaksi tunai"
        actions={<MutasiKasButton accounts={allAccounts ?? []} role={role} />}
      />
      
      <div className="p-6 space-y-6">
        
        {/* Balances Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Total Saldo */}
          <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <WalletCards className="h-24 w-24" />
            </div>
            <div className="relative z-10 min-w-0">
              <p className="text-blue-100 font-medium mb-1 truncate">
                Total Saldo {!isPrivileged && '(Kas, Brankas & Setoran)'}
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight truncate" title={formatRupiah(totalSaldo)}>{formatRupiah(totalSaldo)}</h2>
            </div>
            <div className="relative z-10 mt-6 pt-4 border-t border-blue-500/30 flex items-center justify-between text-sm">
              <span>Diperbarui secara real-time</span>
              {isPrivileged && (
                <Link href="/laporan/arus-kas" className="flex items-center gap-1 hover:text-blue-200 transition-colors">
                  Lihat Arus Kas <ArrowRightLeft className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Per-account cards */}
          {visibleAccounts.map(acc => {
            const saldo = saldoMap[acc.id] ?? 0
            const colors = accountColors[acc.type] ?? accountColors['BANK']
            return (
              <div key={acc.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${colors.bg} ${colors.icon}`}>
                    {getIcon(acc)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-700 truncate">{acc.name}</h3>
                    <p className="text-xs text-gray-400">{acc.type}</p>
                  </div>
                </div>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 truncate" title={formatRupiah(saldo)}>
                  {formatRupiah(saldo)}
                </p>
              </div>
            )
          })}

        </div>

        {/* Incoming Sales Kalkulator */}
        <IncomingSalesFilterCard />

        {/* Recent Transactions Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">50 Transaksi Kas Terakhir</h3>
            {isPrivileged && (
              <Link href="/laporan/arus-kas" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Lihat Selengkapnya &rarr;
              </Link>
            )}
          </div>
          <RiwayatKasTable recentTransactions={recentTransactions ?? []} />
        </div>

      </div>
    </div>
  )
}
