'use client'

import { Tabs } from '@/components/ui/Tabs'
import { StokProdukTable } from '@/components/tables/StokProdukTable'
import { AkiBekasClient } from './AkiBekasClient'
import { Boxes, Droplets, Battery } from 'lucide-react'

interface StokPageClientProps {
  products: any[]
  batchByProduct: Record<string, any[]>
  role?: string
  akiBekasData?: {
    initialBalance: number
    categories: any[]
    summary: any[]
    purchases: any[]
    sales: any[]
    bankTransactions: any[]
  }
}

const tabs = [
  { id: 'produk', label: 'Stok Aki', icon: <Boxes className="h-4 w-4" /> },
  { id: 'air-aki', label: 'Stok Air Aki', icon: <Droplets className="h-4 w-4" /> },
  { id: 'aki-bekas', label: 'Aki Bekas', icon: <Battery className="h-4 w-4" /> },
]

export function StokPageClient({ products, batchByProduct, role, akiBekasData }: StokPageClientProps) {
  const productsAki = products.filter(p => p.kategori !== 'Air Aki')
  const productsAirAki = products.filter(p => p.kategori === 'Air Aki')

  return (
    <Tabs
      tabs={tabs}
      defaultTab="produk"
      contents={{
        'produk': <StokProdukTable products={productsAki} batchByProduct={batchByProduct} role={role} />,
        'air-aki': <StokProdukTable products={productsAirAki} batchByProduct={batchByProduct} role={role} isAirAki={true} />,
        'aki-bekas': akiBekasData ? <AkiBekasClient {...akiBekasData} /> : <div className="p-4 text-center text-gray-500">Memuat data aki bekas...</div>
      }}
    />
  )
}
