export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import { WalletCards, Landmark, CreditCard, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'
import { RiwayatKasTable } from '@/components/tables/RiwayatKasTable'

export default async function KasBankPage() {
  const supabase = await createClient()

  // 1. Calculate Balances by fetching sum of debits and credits
  const { data: allCash } = await supabase
    .from('cash_transactions')
    .select('account_type, debit, credit')

  let saldoKas = 0
  let saldoBank = 0

  allCash?.forEach(tx => {
    if (tx.account_type === 'KAS') {
      saldoKas += (tx.debit - tx.credit)
    } else if (tx.account_type === 'BANK') {
      saldoBank += (tx.debit - tx.credit)
    }
  })

  const totalSaldo = saldoKas + saldoBank

  // 2. Fetch Recent Transactions (last 50)
  const { data: recentTransactions } = await supabase
    .from('cash_transactions')
    .select('*')
    .order('tanggal', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      <Header 
        title="Kas & Bank" 
        subtitle="Posisi saldo riil dan riwayat transaksi tunai" 
      />
      
      <div className="p-6 space-y-6">
        
        {/* Balances Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Total Saldo */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <WalletCards className="h-24 w-24" />
            </div>
            <div className="relative z-10">
              <p className="text-blue-100 font-medium mb-1">Total Saldo (Kas + Bank)</p>
              <h2 className="text-4xl font-bold tracking-tight">{formatRupiah(totalSaldo)}</h2>
            </div>
            <div className="relative z-10 mt-6 pt-4 border-t border-blue-500/30 flex items-center justify-between text-sm">
              <span>Diperbarui secara real-time</span>
              <Link href="/laporan/arus-kas" className="flex items-center gap-1 hover:text-blue-200 transition-colors">
                Lihat Arus Kas <ArrowRightLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Saldo KAS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <WalletCards className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-700">Saldo Kas Tunai</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatRupiah(saldoKas)}</p>
            </div>
            
            {/* Saldo BANK */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Landmark className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-700">Saldo Rekening Bank</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatRupiah(saldoBank)}</p>
            </div>
          </div>

        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">50 Transaksi Kas Terakhir</h3>
            <Link href="/laporan/arus-kas" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Lihat Selengkapnya &rarr;
            </Link>
          </div>
          <RiwayatKasTable recentTransactions={recentTransactions ?? []} />
        </div>

      </div>
    </div>
  )
}
