'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { formatRupiah } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  TrendingUp,
  SlidersHorizontal,
  Package,
  CircleDollarSign,
  BarChart3,
  Activity,
  ArrowDownRight,
  Battery,
} from 'lucide-react'

interface AkiBekasSaleData {
  tanggal: string
  qty: number
  harga_jual_unit: number
  laba: number
}

interface Props {
  sales: AkiBekasSaleData[]
}

export function AkiBekasDashboardClient({ sales }: Props) {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [showFilter, setShowFilter] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false)
      }
    }
    if (showFilter) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilter])

  const setPreset = (preset: 'minggu' | 'bulan' | 'tahun') => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    let start = ''
    if (preset === 'minggu') {
      const d = new Date(today); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0]
    } else if (preset === 'bulan') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    } else {
      start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
    }
    setStartDate(start); setEndDate(end)
  }

  const filteredSales = useMemo(() =>
    sales.filter(s => { const d = s.tanggal.split('T')[0]; return d >= startDate && d <= endDate }),
    [sales, startDate, endDate]
  )

  // Summaries
  const totalQty = filteredSales.reduce((a, s) => a + (s.qty ?? 0), 0)
  const totalOmzet = filteredSales.reduce((a, s) => a + ((s.qty ?? 0) * (s.harga_jual_unit ?? 0)), 0)
  const totalLabaKotor = filteredSales.reduce((a, s) => a + (s.laba ?? 0), 0)

  // Bar chart data
  const chartData = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24)
    const groupBy = diffDays > 60 ? 'month' : 'day'

    const omzetGroups: Record<string, number> = {}
    const labaGroups: Record<string, number> = {}

    filteredSales.forEach(s => {
      let key = s.tanggal.split('T')[0]
      if (groupBy === 'month') key = key.substring(0, 7)
      omzetGroups[key] = (omzetGroups[key] || 0) + ((s.qty ?? 0) * (s.harga_jual_unit ?? 0))
      labaGroups[key] = (labaGroups[key] || 0) + (s.laba ?? 0)
    })

    const keys = Object.keys(omzetGroups).sort()
    const maxVal = Math.max(...keys.map(k => omzetGroups[k]), 1)

    return keys.map(k => ({
      label: groupBy === 'month' ? formatMonth(k) : formatDay(k),
      omzet: omzetGroups[k],
      laba: labaGroups[k] ?? 0,
    }))
  }, [filteredSales, startDate, endDate])

  function formatMonth(ym: string) {
    const [y, m] = ym.split('-')
    return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][parseInt(m) - 1] + ' ' + y
  }
  function formatDay(ymd: string) {
    const [, m, d] = ymd.split('-')
    return `${parseInt(d)}/${parseInt(m)}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-6">

      {/* Header & Filter */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Battery className="h-5 w-5 text-indigo-600" />
            Performa Penjualan Aki Bekas
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Perbandingan omzet dan laba kotor aki bekas</p>
        </div>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${showFilter
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
          </button>

          {showFilter && (
            <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 min-w-[280px]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Pilih Periode</p>
              <div className="flex gap-2 mb-4">
                {(['minggu', 'bulan', 'tahun'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPreset(p); setShowFilter(false) }}
                    className="flex-1 px-2 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition"
                  >
                    {p === 'minggu' ? '7 Hari' : p === 'bulan' ? 'Bulan Ini' : 'Tahun Ini'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rentang Tanggal</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8 shrink-0">Dari</span>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8 shrink-0">Ke</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <button
                onClick={() => setShowFilter(false)}
                className="mt-4 w-full py-2 text-xs font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-1.5 text-indigo-700">
            <Package className="w-4 h-4" />
            <span className="text-[11px] font-medium">Unit Terjual</span>
          </div>
          <p className="text-xl font-bold text-indigo-800">{totalQty} <span className="text-xs font-medium text-indigo-500">pcs</span></p>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center gap-2 mb-1.5 text-violet-700">
            <CircleDollarSign className="w-4 h-4" />
            <span className="text-[11px] font-medium">Omzet</span>
          </div>
          <p className="text-sm font-bold text-violet-900">{formatRupiah(totalOmzet)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-1.5 text-orange-700">
            <BarChart3 className="w-4 h-4" />
            <span className="text-[11px] font-medium">Laba Kotor</span>
          </div>
          <p className="text-sm font-bold text-orange-900">{formatRupiah(totalLabaKotor)}</p>
        </div>
      </div>

      {/* Line Chart */}
      <div>
        {chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-100">
            Tidak ada data penjualan di rentang tanggal ini.
          </div>
        ) : (
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}Jt` : value >= 1000 ? `${(value / 1000).toFixed(0)}Rb` : value}
                  dx={-10}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}Jt` : value >= 1000 ? `${(value / 1000).toFixed(0)}Rb` : value}
                  dx={10}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: any) => formatRupiah(value as number)}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="omzet"
                  name="Omzet"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="laba"
                  name="Laba Kotor"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
