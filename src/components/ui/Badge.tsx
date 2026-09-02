import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Status badge yang otomatis menentukan variant berdasarkan status
interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    LUNAS: { label: 'Lunas', variant: 'success' },
    HUTANG: { label: 'Hutang', variant: 'danger' },
    PARSIAL: { label: 'Parsial', variant: 'warning' },
    POSTED: { label: 'Posted', variant: 'info' },
    DRAFT: { label: 'Draft', variant: 'default' },
    CANCELLED: { label: 'Dibatalkan', variant: 'danger' },
    PAID: { label: 'Lunas', variant: 'success' },
    VOID: { label: 'KELUAR', variant: 'danger' },
    MASUK: { label: 'MASUK', variant: 'success' },
    KELUAR: { label: 'KELUAR', variant: 'danger' },
  }

  const conf = config[status] ?? { label: status, variant: 'default' as const }

  return <Badge variant={conf.variant}>{conf.label}</Badge>
}

// Payment badge
interface PaymentBadgeProps {
  method: string
  keterangan?: string | null
}

export function PaymentBadge({ method, keterangan }: PaymentBadgeProps) {
  let display = method
  if (keterangan) {
    const match = keterangan.match(/(?:Bank|Akun):\s*([^|]+)/i)
    if (match) {
      display = `${method} - ${match[1].trim().toUpperCase()}`
    }
  }

  let variant: BadgeProps['variant'] = 'default'
  const textLower = display.toLowerCase()
  if (textLower.includes('mandiri') || textLower.includes('bca') || textLower.includes('bri')) {
    variant = 'info'
  } else if (textLower.includes('bni') || textLower.includes('qris')) {
    variant = 'warning'
  } else if (textLower.includes('cash') || textLower.includes('kas')) {
    variant = 'success'
  }

  return <Badge variant={variant}>{display}</Badge>
}
