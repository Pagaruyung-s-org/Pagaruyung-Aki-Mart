'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormPembelian } from '@/components/forms/FormPembelian'
import { Tabs } from '@/components/ui/Tabs'

interface Supplier {
  id: string
  nama_supplier: string
  kode_supplier: string
}

interface Product {
  id: string
  merk: string
  kategori: string
  type: string | null
  kode_baterai: string | null
  kapasitas_ah: number
  kode_produk: string
  harga_jual: number
}

interface Account {
  id: string
  name: string
  type: string
  is_active: boolean
}

interface PembelianModalButtonProps {
  type: 'aki' | 'air_aki'
  suppliers: Supplier[]
  products?: Product[]
  label: string
  role?: string
  accounts?: Account[]
}

export function PembelianModalButton({ type, suppliers, products = [], label, role, accounts = [] }: PembelianModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const akiProducts = products.filter(p => p.kategori !== 'Air Aki')
  const airAkiProducts = products.filter(p => p.kategori === 'Air Aki')

  return (
    <>
      <Button id={type === 'aki' ? 'buat-pembelian-btn' : 'buat-pembelian-air-aki-btn'} onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Buat Pembelian"
        size="3xl"
      >
        <div className="pt-2">
          <Tabs 
            tabs={[
              { id: 'aki', label: 'Pembelian Aki' },
              { id: 'air-aki', label: 'Pembelian Air Aki' }
            ]}
            defaultTab={type === 'air_aki' ? 'air-aki' : 'aki'}
            contents={{
              'aki': (
                <FormPembelian 
                  suppliers={suppliers} 
                  products={akiProducts} 
                  role={role}
                  accounts={accounts}
                  onSuccess={() => setIsOpen(false)}
                  onCancel={() => setIsOpen(false)}
                />
              ),
              'air-aki': (
                <FormPembelian 
                  suppliers={suppliers} 
                  products={airAkiProducts} 
                  isAirAki={true}
                  role={role}
                  accounts={accounts}
                  onSuccess={() => setIsOpen(false)}
                  onCancel={() => setIsOpen(false)}
                />
              )
            }}
          />
        </div>
      </Modal>
    </>
  )
}
