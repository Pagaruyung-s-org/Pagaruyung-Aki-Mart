export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { HutangTable, HutangItem } from '@/components/tables/HutangTable'
import { RiwayatPembayaranHutangTable } from '@/components/tables/RiwayatPembayaranHutangTable'
import { getUserRole } from '@/actions/users'

export default async function BayarHutangPage() {
  const supabase = await createClient()

  const [role, { data: purchases }, { data: paymentsHistory }] = await Promise.all([
    getUserRole(),
    supabase
      .from('purchase_transactions')
      .select(`
        id,
        kode_pembelian,
        tanggal,
        supplier_id,
        total,
        status_pembayaran,
        suppliers ( nama_supplier ),
        supplier_payments ( nominal )
      `)
      .in('status_pembayaran', ['HUTANG', 'PARSIAL'])
      .eq('status_transaksi', 'POSTED')
      .order('tanggal', { ascending: false }),
    supabase
      .from('supplier_payments')
      .select(`
        *,
        suppliers ( nama_supplier ),
        purchase_transactions ( kode_pembelian )
      `)
      .order('tanggal', { ascending: false })
      .limit(50)
  ])

  const mappedData: HutangItem[] = (purchases || []).map((p: any) => {
    // Hitung total yang sudah dibayar
    const sudah_dibayar = p.supplier_payments?.reduce((sum: number, payment: any) => sum + payment.nominal, 0) || 0
    const sisa_hutang = p.total - sudah_dibayar

    return {
      id: p.id,
      kode_pembelian: p.kode_pembelian,
      tanggal: p.tanggal,
      supplier_id: p.supplier_id,
      supplier_name: (p.suppliers as any)?.nama_supplier || 'Unknown Supplier',
      total: p.total,
      sudah_dibayar,
      sisa_hutang,
      status_pembayaran: p.status_pembayaran
    }
  })

  // Pastikan kita hanya menampilkan yang sisa hutangnya > 0 (jika ada data nyangkut)
  const finalData = mappedData.filter(d => d.sisa_hutang > 0)

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Pembayaran Hutang" 
        subtitle="Kelola dan lunasi hutang pembelian ke supplier" 
      />
      <div className="flex-1 p-6">
        <HutangTable data={finalData} role={role ?? null} />
        
        <RiwayatPembayaranHutangTable payments={paymentsHistory || []} role={role ?? null} />
      </div>
    </div>
  )
}
