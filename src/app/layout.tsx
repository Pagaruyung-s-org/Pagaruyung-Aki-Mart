import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pagaruyung Aki Mart — Manajemen Penjualan & Keuangan',
  description: 'Aplikasi manajemen penjualan, pembelian, stok, dan keuangan',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${geist.className} antialiased bg-gray-50`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
