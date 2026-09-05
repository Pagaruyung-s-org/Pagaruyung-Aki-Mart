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
  Lock,
  Vault,
  ClipboardCheck,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'

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
      { label: 'Stok Opname', href: '/stok-opname', icon: <ClipboardCheck className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Keuangan',
    icon: <Wallet className="h-4 w-4" />,
    children: [
      { label: 'Hutang Supplier', href: '/hutang', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Piutang Toko Pusat', href: '/piutang', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Kas/Bank', href: '/kas', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Daftar Akun', href: '/kas/akun', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Closing Harian', href: '/closing', icon: <Lock className="h-4 w-4" /> },
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

function NavLink({
  item,
  depth = 0,
  openSection,
  setOpenSection
}: {
  item: NavItem;
  depth?: number;
  openSection?: string | null;
  setOpenSection?: (label: string | null) => void;
}) {
  const pathname = usePathname()

  const isActive = item.href
    ? pathname === item.href || (pathname.startsWith(item.href + '/') && !allRegisteredPaths.includes(pathname))
    : false

  const hasChildren = item.children && item.children.length > 0
  const isParentActive = hasChildren && item.children?.some(child =>
    child.href && (pathname === child.href || (pathname.startsWith(child.href + '/') && !allRegisteredPaths.includes(pathname)))
  )

  const [manuallyClosed, setManuallyClosed] = useState(false)

  // Reset manually closed state when path changes to a child of this section
  // or when this section becomes active again
  const prevIsParentActive = useRef(isParentActive)
  useEffect(() => {
    if (isParentActive && !prevIsParentActive.current) {
      setManuallyClosed(false)
    }
    prevIsParentActive.current = isParentActive
  }, [isParentActive])

  // Determine if this section is open
  const isTopLevel = depth === 0
  let isOpen = false

  if (hasChildren) {
    if (isTopLevel && setOpenSection) {
      isOpen = isParentActive
        ? !manuallyClosed
        : (openSection === item.label)
    } else {
      isOpen = isParentActive ? !manuallyClosed : false // Fallback for nested, though not used here
    }
  }

  const handleToggle = () => {
    if (!hasChildren) return

    if (isTopLevel && setOpenSection) {
      if (isParentActive) {
        setManuallyClosed(!manuallyClosed)
        if (manuallyClosed) {
          setOpenSection(item.label)
        }
      } else {
        if (openSection === item.label) {
          setOpenSection(null)
        } else {
          setOpenSection(item.label)
        }
      }
    } else {
      setManuallyClosed(!manuallyClosed)
    }
  }

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer',
            isParentActive
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          )}
        >
          <span className={isParentActive ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </button>
        <div
          className={cn(
            "grid transition-all duration-200 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="ml-3 border-l border-gray-200 pl-3 flex flex-col gap-0.5">
              {item.children!.map((child) => (
                <NavLink key={child.href} item={child} depth={depth + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer',
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
    if (item.label === 'Transaksi') {
      const filteredChildren = item.children?.filter(child => {
        if (role === 'ADMIN' && (child.label === 'Bayar Hutang')) return false
        return true
      })
      return { ...item, children: filteredChildren }
    }
    if (item.label === 'Master Data') {
      const filteredChildren = item.children?.filter(child => {
        if (role === 'ADMIN' && child.label === 'Kategori Biaya') return false
        return true
      })
      return { ...item, children: filteredChildren }
    }
    if (item.label === 'Pengaturan') {
      const filteredChildren = item.children?.filter(child => {
        if (child.label === 'User Management') return role === 'SUPER_ADMIN'
        if (child.label === 'Log Aktivitas') return role === 'SUPER_ADMIN' || role === 'OWNER'
        return true
      })
      return { ...item, children: filteredChildren }
    }
    if (item.label === 'Keuangan') {
      const filteredChildren = item.children?.filter(child => {
        if (role === 'ADMIN' && (child.label === 'Hutang Supplier' || child.label === 'Piutang Toko Pusat' || child.label === 'Kas/Bank' || child.label === 'Daftar Akun')) return false
        return true
      })
      return { ...item, children: filteredChildren }
    }
    if (item.label === 'Persediaan') {
      return item
    }
    return item
  }).filter(item => {
    if (item.label === 'Pengaturan' && (!item.children || item.children.length === 0)) return false
    if (item.label === 'Keuangan' && (!item.children || item.children.length === 0)) return false
    if (role === 'ADMIN' && item.label === 'Laporan') return false
    return true
  })

  const [openSection, setOpenSection] = useState<string | null>(null)

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100 flex items-center justify-center p-1 shrink-0">
            <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[13px] leading-tight">PT. Pagaruyung Mitra Persada (Aki Mart)</p>
            <p className="text-[11px] text-gray-500">Sistem Manajemen</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-0.5">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            openSection={openSection}
            setOpenSection={setOpenSection}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Pagaruyung Aki v1.0</p>
      </div>
    </aside>
  )
}
