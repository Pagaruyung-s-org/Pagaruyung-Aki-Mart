'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MutasiKasModal } from '@/components/forms/MutasiKasModal'
import { useRouter } from 'next/navigation'

interface Account { id: string; name: string; type: string }

export function MutasiKasButton({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        id="btn-mutasi-kas"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Mutasi Kas
      </Button>

      {open && (
        <MutasiKasModal
          accounts={accounts}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
