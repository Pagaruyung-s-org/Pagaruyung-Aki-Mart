'use client'

import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Export PDF', href }: { label?: string, href?: string }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Printer className="h-4 w-4" />
        {label}
      </a>
    )
  }
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  )
}
