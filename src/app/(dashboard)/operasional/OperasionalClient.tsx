'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormOperasional } from '@/components/forms/FormOperasional'

interface OperasionalClientProps {
  categories: any[]
  employees: any[]
}

export function OperasionalClient({ categories, employees }: OperasionalClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Catat Pengeluaran</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Catat Biaya Operasional
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Form Biaya Operasional"
        size="lg"
      >
        <FormOperasional 
          categories={categories} 
          employees={employees} 
          onSuccess={() => {
            setIsModalOpen(false)
            // Trigger refresh is already handled in router.refresh() inside action or can be handled by page.tsx auto-revalidation.
            window.location.reload()
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </>
  )
}
