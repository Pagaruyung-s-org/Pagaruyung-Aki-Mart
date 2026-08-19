'use client'

import { Printer } from 'lucide-react'
import { useState } from 'react'

export function PrintButton({ label = 'Export PDF', href }: { label?: string, href?: string }) {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrintClick = (e: React.MouseEvent) => {
    if (href) {
      e.preventDefault()
      setIsPrinting(true)
      
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = href
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setIsPrinting(false)
          setTimeout(() => {
            document.body.removeChild(iframe)
          }, 5000)
        }, 500)
      }
      
      document.body.appendChild(iframe)
    } else {
      window.print()
    }
  }

  return (
    <button
      onClick={handlePrintClick}
      disabled={isPrinting}
      className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait"
    >
      <Printer className="h-4 w-4" />
      {isPrinting ? 'Menyiapkan...' : label}
    </button>
  )
}
