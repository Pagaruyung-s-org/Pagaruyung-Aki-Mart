import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl', className)}>
      {children}
    </div>
  )
}

// Stat card untuk dashboard
interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; label: string }
  colorClass?: string
}

export function StatCard({ title, value, subtitle, icon, trend, colorClass = 'text-blue-600 bg-blue-50' }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3">
        <div className={cn('p-3 rounded-xl w-fit', colorClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 text-xs font-medium mt-2',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
