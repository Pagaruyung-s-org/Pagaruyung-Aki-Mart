'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormPenjualan } from '@/components/forms/FormPenjualan'
import { Tabs } from '@/components/ui/Tabs'

interface Product {
  id: string
  merk: string
  kategori: string
  type: string | null
  kode_baterai: string | null
  kapasitas_ah: number
  kode_produk: string
  harga_jual: number
  qty_stok: number
}

interface PenjualanModalButtonProps {
  type: 'aki' | 'air_aki'
  products?: Product[]
  label: string
}

export function PenjualanModalButton({ type, products = [], label }: PenjualanModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const akiProducts = products.filter(p => p.kategori !== 'Air Aki')
  const airAkiProducts = products.filter(p => p.kategori === 'Air Aki')

  return (
    <>
      <Button id="buat-penjualan-btn" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Buat Penjualan"
        size="3xl"
      >
        <div className="pt-2">
          <Tabs 
            tabs={[
              { id: 'aki', label: 'Penjualan Aki' },
              { id: 'air-aki', label: 'Penjualan Air Aki Eceran' }
            ]}
            defaultTab={type === 'air_aki' ? 'air-aki' : 'aki'}
            contents={{
              'aki': (
                <FormPenjualan 
                  products={akiProducts} 
                  airAkiProducts={airAkiProducts}
                  showAirAkiCheckbox={true}
                  onSuccess={() => setIsOpen(false)}
                  onCancel={() => setIsOpen(false)}
                />
              ),
              'air-aki': (
                <FormPenjualan 
                  products={airAkiProducts} 
                  showAirAkiCheckbox={false}
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
