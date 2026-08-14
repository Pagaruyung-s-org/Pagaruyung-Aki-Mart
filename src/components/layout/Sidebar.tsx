'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Tag,
  ShoppingCart,
  Receipt,
  DollarSign,
  CreditCard,
  Boxes,
  ArrowLeftRight,
  Wallet,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Droplets,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Master Data',
    icon: <Package className="h-4 w-4" />,
    children: [
      { label: 'Produk', href: '/produk', icon: <Package className="h-4 w-4" /> },
      { label: 'Supplier', href: '/supplier', icon: <Truck className="h-4 w-4" /> },
      { label: 'Karyawan', href: '/karyawan', icon: <Users className="h-4 w-4" /> },
      { label: 'Kategori Biaya', href: '/kategori', icon: <Tag className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Transaksi',
    icon: <Receipt className="h-4 w-4" />,
    children: [
      { label: 'Pembelian', href: '/pembelian', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Penjualan', href: '/penjualan', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Operasional', href: '/operasional', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Bayar Hutang', href: '/hutang/bayar', icon: <Wallet className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Persediaan',
    icon: <Boxes className="h-4 w-4" />,
    children: [
      { label: 'Stok Produk', href: '/stok', icon: <Boxes className="h-4 w-4" /> },
      { label: 'Mutasi Stok', href: '/stok/mutasi', icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Keuangan',
    icon: <Wallet className="h-4 w-4" />,
    children: [
      { label: 'Hutang Supplier', href: '/hutang', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Kas/Bank', href: '/kas', icon: <Wallet className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Laporan',
    icon: <FileText className="h-4 w-4" />,
    children: [
      { label: 'Penjualan', href: '/laporan/penjualan', icon: <TrendingUp className="h-4 w-4" /> },
      { label: 'Pembelian', href: '/laporan/pembelian', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Hutang', href: '/laporan/hutang', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Operasional', href: '/laporan/operasional', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Laba Rugi', href: '/laporan/laba-rugi', icon: <TrendingUp className="h-4 w-4" /> },
      { label: 'Arus Kas', href: '/laporan/arus-kas', icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Pengaturan',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { label: 'User Management', href: '/users', icon: <Users className="h-4 w-4" /> },
      { label: 'Log Aktivitas', href: '/activity-log', icon: <FileText className="h-4 w-4" /> },
    ],
  },
]

// Extract all registered paths
const allRegisteredPaths = navItems.flatMap(group =>
  group.children ? group.children.map(c => c.href) : [group.href]
).filter(Boolean) as string[]

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()

  const isActive = item.href
    ? pathname === item.href || (pathname.startsWith(item.href + '/') && !allRegisteredPaths.includes(pathname))
    : false

  const hasChildren = item.children && item.children.length > 0
  const isParentActive = hasChildren && item.children?.some(child =>
    child.href && (pathname === child.href || (pathname.startsWith(child.href + '/') && !allRegisteredPaths.includes(pathname)))
  )
  const [open, setOpen] = useState(isParentActive ?? false)

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
            isParentActive
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          )}
        >
          <span className={isParentActive ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          }
        </button>
        {open && (
          <div className="ml-3 mt-1 border-l border-gray-200 pl-3 flex flex-col gap-0.5">
            {item.children!.map((child) => (
              <NavLink key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
        isActive
          ? 'bg-blue-600 text-white font-medium shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <span className={isActive ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

export function Sidebar({ role }: { role: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | null }) {
  const filteredNavItems = navItems.map(item => {
    if (item.label === 'Pengaturan') {
      const filteredChildren = item.children?.filter(child => {
        if (child.label === 'User Management') return role === 'SUPER_ADMIN'
        if (child.label === 'Log Aktivitas') return role === 'SUPER_ADMIN' || role === 'OWNER'
        return true
      })
      return { ...item, children: filteredChildren }
    }
    return item
  }).filter(item => {
    if (item.label === 'Pengaturan' && (!item.children || item.children.length === 0)) return false
    return true
  })

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center p-1 shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[13px] leading-tight">Pagaruyung Aki Mart</p>
            <p className="text-[11px] text-gray-500">Sistem Manajemen</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-0.5">
        {filteredNavItems.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Pagaruyung Aki v1.0</p>
      </div>
    </aside>
  )
}
