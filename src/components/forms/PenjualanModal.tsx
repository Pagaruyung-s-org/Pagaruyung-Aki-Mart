'use client'

import { useState } from 'react'
import { Plus, CheckCircle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormPenjualan } from '@/components/forms/FormPenjualan'
import { Tabs } from '@/components/ui/Tabs'
import { FakturModal } from '@/components/print/FakturModal'
import { getSaleById } from '@/actions/transactions'

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
  const [successData, setSuccessData] = useState<{ id: string; kode: string } | null>(null)
  const [showFaktur, setShowFaktur] = useState(false)
  const [fakturSale, setFakturSale] = useState<any>(null)
  const [loadingFaktur, setLoadingFaktur] = useState(false)

  const akiProducts = products.filter(p => p.kategori !== 'Air Aki')
  const airAkiProducts = products.filter(p => p.kategori === 'Air Aki')

  const handleSuccess = (saleData?: { id: string; kode: string }) => {
    if (saleData) {
      setSuccessData(saleData)
    } else {
      setIsOpen(false)
    }
  }

  const handleCetakBon = async () => {
    if (!successData) return
    setLoadingFaktur(true)
    try {
      const sale = await getSaleById(successData.id)
      if (sale) {
        setFakturSale(sale)
        setShowFaktur(true)
        setIsOpen(false)
        setSuccessData(null)
      }
    } finally {
      setLoadingFaktur(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSuccessData(null)
  }

  return (
    <>
      <Button id="buat-penjualan-btn" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" /> {label}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={successData ? 'Penjualan Berhasil' : 'Buat Penjualan'}
        size={successData ? 'sm' : '3xl'}
      >
        {successData ? (
          /* ---- Success State ---- */
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transaksi Berhasil!</h3>
              <p className="text-sm text-gray-500 mt-1">
                Penjualan <span className="font-mono font-medium text-green-700">{successData.kode}</span> berhasil disimpan.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={handleClose}
              >
                Tutup
              </Button>
              <Button
                onClick={handleCetakBon}
                loading={loadingFaktur}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Cetak Bon
              </Button>
            </div>
          </div>
        ) : (
          /* ---- Form State ---- */
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
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                  />
                ),
                'air-aki': (
                  <FormPenjualan 
                    products={airAkiProducts} 
                    showAirAkiCheckbox={false}
                    onSuccess={handleSuccess}
                    onCancel={handleClose}
                  />
                )
              }}
            />
          </div>
        )}
      </Modal>

      {/* Faktur Modal */}
      <FakturModal
        isOpen={showFaktur}
        onClose={() => setShowFaktur(false)}
        sale={fakturSale}
        autoPrint={true}
      />
    </>
  )
}
