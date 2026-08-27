'use client'

import { useState, useMemo } from 'react'
import { formatRupiah } from '@/lib/utils'
import { Package, DollarSign, Calendar, TrendingUp } from 'lucide-react'

interface SaleData {
  tanggal: string
  total: number
  total_qty: number
  qty_aki: number
  qty_air_aki: number
}

interface Props {
  sales: SaleData[]
}

export function SalesDashboardClient({ sales }: Props) {
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to first day of current month
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })

  const [endDate, setEndDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0]
  })

  // Quick preset handlers
  const setPreset = (preset: 'minggu' | 'bulan' | 'tahun') => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    let start = ''

    if (preset === 'minggu') {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      start = d.toISOString().split('T')[0]
    } else if (preset === 'bulan') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1)
      start = d.toISOString().split('T')[0]
    } else if (preset === 'tahun') {
      const d = new Date(today.getFullYear(), 0, 1)
      start = d.toISOString().split('T')[0]
    }

    setStartDate(start)
    setEndDate(end)
  }

  // Filter Data
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const date = s.tanggal.split('T')[0]
      return date >= startDate && date <= endDate
    })
  }, [sales, startDate, endDate])

  // Summaries
  const totalOmzet = filteredSales.reduce((acc, s) => acc + s.total, 0)
  const totalQtyAki = filteredSales.reduce((acc, s) => acc + (s.qty_aki ?? 0), 0)
  const totalQtyAirAki = filteredSales.reduce((acc, s) => acc + (s.qty_air_aki ?? 0), 0)

  // Chart Data Preparation
  const chartData = useMemo(() => {
    // Group by day for short ranges, or month for long ranges
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24)

    const groupBy = diffDays > 60 ? 'month' : 'day'

    const groups: Record<string, number> = {}

    filteredSales.forEach(s => {
      let key = s.tanggal.split('T')[0]
      if (groupBy === 'month') {
        key = key.substring(0, 7) // YYYY-MM
      }
      groups[key] = (groups[key] || 0) + s.total
    })

    const entries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    const maxVal = Math.max(...entries.map(e => e[1]), 1)

    return entries.map(([k, v]) => ({
      label: groupBy === 'month' ? formatMonth(k) : formatDay(k),
      value: v,
      pct: (v / maxVal) * 100
    }))
  }, [filteredSales, startDate, endDate])

  // Helpers
  function formatMonth(ym: string) {
    const [y, m] = ym.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    return `${months[parseInt(m) - 1]} ${y}`
  }
  function formatDay(ymd: string) {
    const [, m, d] = ymd.split('-')
    return `${parseInt(d)}/${parseInt(m)}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Performa Penjualan
          </h3>
          <p className="text-sm text-gray-500">Analisa jumlah barang terjual dan tren omzet</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <div className="flex gap-1">
            <button onClick={() => setPreset('minggu')} className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-100 hover:text-gray-900 transition">7 Hari</button>
            <button onClick={() => setPreset('bulan')} className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-100 hover:text-gray-900 transition">Bulan Ini</button>
            <button onClick={() => setPreset('tahun')} className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded hover:bg-gray-100 hover:text-gray-900 transition">Tahun Ini</button>
          </div>
          <div className="hidden sm:block text-gray-300">|</div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* KPI Cards (Left column on desktop) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <p className="font-medium text-blue-900">Aki Terjual</p>
            </div>
            <h4 className="text-3xl font-bold text-blue-700">{totalQtyAki} <span className="text-lg font-medium text-blue-500">Unit</span></h4>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-sky-50 border border-cyan-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <p className="font-medium text-cyan-900">Air Aki Terjual</p>
            </div>
            <h4 className="text-3xl font-bold text-cyan-700">{totalQtyAirAki} <span className="text-lg font-medium text-cyan-500">Botol</span></h4>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="font-medium text-green-900">Total Omzet</p>
            </div>
            <h4 className="text-2xl font-bold text-green-700">{formatRupiah(totalOmzet)}</h4>
          </div>
        </div>

        {/* Chart (Right column on desktop) */}
        <div className="lg:col-span-3 bg-gray-50 rounded-xl border border-gray-100 p-5 flex flex-col justify-end min-h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Tidak ada data penjualan di rentang tanggal ini.
            </div>
          ) : (
            <div className="relative w-full flex-1 mt-6 pb-6">
              {/* SVG Line and Area */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={chartData.length === 1
                    ? `M 50 100 L 50 ${90 - (chartData[0].pct * 0.8)} L 50 100 Z`
                    : `M 0 100 L ${chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${90 - (d.pct * 0.8)}`).join(' L ')} L 100 100 Z`
                  }
                  fill="url(#gradient-blue)"
                />
                <polyline
                  points={chartData.length === 1
                    ? `50,${90 - (chartData[0].pct * 0.8)}`
                    : chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${90 - (d.pct * 0.8)}`).join(' ')
                  }
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>

              {/* Data Points & Labels */}
              <div className="absolute inset-0 flex justify-between h-full pointer-events-none">
                {chartData.map((d, i) => {
                  const xPos = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
                  const yPos = 90 - (d.pct * 0.8);
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto group cursor-pointer"
                      style={{ left: `${xPos}%`, transform: 'translateX(-50%)', width: '40px' }}
                    >
                      {/* Vertical Guideline on Hover */}
                      <div className="absolute top-0 bottom-0 w-[1px] bg-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" style={{ bottom: '24px' }} />

                      {/* Hover Tooltip */}
                      <div
                        className="absolute z-20 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg whitespace-nowrap pointer-events-none"
                        style={{ top: `calc(${yPos}% - 35px)` }}
                      >
                        {formatRupiah(d.value)}
                        <div className="text-[9px] text-gray-300 text-center mt-0.5">{d.label}</div>
                      </div>

                      {/* The Dot */}
                      <div
                        className="absolute w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full group-hover:bg-blue-600 group-hover:scale-125 transition-all shadow-sm z-10"
                        style={{ top: `${yPos}%`, transform: 'translateY(-50%)' }}
                      />

                      {/* X-Axis Label */}
                      <span className="absolute bottom-0 text-[10px] font-medium text-gray-500 whitespace-nowrap translate-y-6">
                        {d.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
