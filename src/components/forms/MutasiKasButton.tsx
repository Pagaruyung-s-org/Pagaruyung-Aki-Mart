'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MutasiKasModal } from '@/components/forms/MutasiKasModal'
import { useRouter } from 'next/navigation'

interface Account { id: string; name: string; type: string }

export function MutasiKasButton({ accounts, role }: { accounts: Account[]; role: string }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button
        id="btn-pindah-saldo"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2"
      >
        <ArrowRightLeft className="h-4 w-4" />
        Mutasi Kas
      </Button>

      {open && (
        <MutasiKasModal
          accounts={accounts}
          role={role}
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
