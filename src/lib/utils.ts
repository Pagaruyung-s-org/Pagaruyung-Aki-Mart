import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================================
// CSS CLASS UTILITY
// ============================================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// FORMAT MATA UANG (Rupiah)
// ============================================================
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

// ============================================================
// FORMAT TANGGAL
// ============================================================
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

export function getBestDateForDisplay(tanggalStr: string, createdAtStr?: string): string {
  if (!createdAtStr) return formatDateTime(tanggalStr)
  const t = new Date(tanggalStr)
  const c = new Date(createdAtStr)
  
  // Jika tahun, bulan, dan tanggal sama (berarti input hari ini), gunakan created_at karena jamnya lebih akurat
  if (t.getFullYear() === c.getFullYear() && t.getMonth() === c.getMonth() && t.getDate() === c.getDate()) {
    return formatDateTime(createdAtStr)
  }
  // Jika beda (berarti backdate/edit tanggal sebelum hari ini), gunakan tanggal yang diinput
  return formatDateTime(tanggalStr)
}

// Format date for input[type="date"]
export function toInputDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0]
  }
  return new Date(dateStr).toISOString().split('T')[0]
}

// ============================================================
// KALKULASI BISNIS
// ============================================================



// Hitung harga modal per unit
export function hitungHargaModalUnit(nominal: number, qty: number): number {
  if (qty <= 0) return 0
  return Math.round(nominal / qty)
}

// ============================================================
// GENERATE KODE DOKUMEN (client-side preview, actual dari server)
// ============================================================
export function getKodePrefix(type: 'pembelian' | 'penjualan' | 'operasional' | 'pembayaran'): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefixes = {
    pembelian: 'PB',
    penjualan: 'PJ',
    operasional: 'OP',
    pembayaran: 'PH',
  }
  return `${prefixes[type]}-${year}${month}-`
}

// ============================================================
// STATUS BADGE COLORS
// ============================================================
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LUNAS: 'bg-green-100 text-green-700',
    HUTANG: 'bg-red-100 text-red-700',
    PARSIAL: 'bg-yellow-100 text-yellow-700',
    POSTED: 'bg-blue-100 text-blue-700',
    DRAFT: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
    PAID: 'bg-green-100 text-green-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Tunai',
    TRANSFER: 'Transfer Bank',
    QRIS: 'QRIS',
  }
  return labels[method] ?? method
}

// ============================================================
// STOK HELPER
// ============================================================
export function getStokStatus(qty: number): {
  label: string
  color: string
} {
  if (qty <= 0) return { label: 'Habis', color: 'text-red-600' }
  if (qty <= 3) return { label: 'Hampir Habis', color: 'text-orange-500' }
  return { label: 'Tersedia', color: 'text-green-600' }
}

// ============================================================
// LABA RUGI
// ============================================================
export function hitungLabaKotor(subtotal: number, hppFifo: number): number {
  return subtotal - hppFifo
}

export function hitungLabaOperasional(labaKotor: number, totalOperasional: number): number {
  return labaKotor - totalOperasional
}
