'use client'

import React, { useState, useMemo } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { AlertTriangle, Clock, WalletCards, ArrowDownRight, Search, ChevronRight } from 'lucide-react'

export interface DebtData {
  id: string
  tanggal: string
  tanggal_jatuh_tempo: string | null
  nomor_faktur: string | null
  supplier_name: string
  total: number
  terbayar: number
  sisa_hutang: number
}

interface HutangSupplierClientProps {
  data: DebtData[]
}

interface GroupedDebt {
  id: string
  supplier_name: string
  billingMonth: Date
  billingMonthName: string
  items: DebtData[]
  totalSisaHutang: number
  earliestJatuhTempo: string | null
  statusLabel: 'AMAN' | 'MENDEKATI' | 'LEWAT' | 'TIDAK_ADA'
  daysDiff: number | null
}

function getBillingMonth(dateStr: string) {
  const d = new Date(dateStr)
  let m = d.getMonth()
  let y = d.getFullYear()
  if (d.getDate() >= 25) {
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }
  return new Date(y, m, 1)
}

export function HutangSupplierClient({ data }: HutangSupplierClientProps) {
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MENDEKATI' | 'LEWAT'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  // Group data by Billing Month and Supplier
  const groupedData = useMemo(() => {
    const groups: Record<string, GroupedDebt> = {}

    data.forEach(item => {
      const bMonth = getBillingMonth(item.tanggal)
      const bMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(bMonth)
      const groupId = `${item.supplier_name}_${bMonth.getTime()}`

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          supplier_name: item.supplier_name,
          billingMonth: bMonth,
          billingMonthName: bMonthName,
          items: [],
          totalSisaHutang: 0,
          earliestJatuhTempo: null,
          statusLabel: 'TIDAK_ADA',
          daysDiff: null
        }
      }

      groups[groupId].items.push(item)
      groups[groupId].totalSisaHutang += item.sisa_hutang

      // Update earliest jatuh tempo
      if (item.tanggal_jatuh_tempo) {
        if (!groups[groupId].earliestJatuhTempo) {
          groups[groupId].earliestJatuhTempo = item.tanggal_jatuh_tempo
        } else {
          const currentEarliest = new Date(groups[groupId].earliestJatuhTempo!)
          const itemJt = new Date(item.tanggal_jatuh_tempo)
          if (itemJt < currentEarliest) {
            groups[groupId].earliestJatuhTempo = item.tanggal_jatuh_tempo
          }
        }
      }
    })

    // Calculate status for each group based on earliest Jatuh Tempo
    Object.values(groups).forEach(g => {
      if (g.earliestJatuhTempo) {
        const jt = new Date(g.earliestJatuhTempo)
        jt.setHours(0, 0, 0, 0)
        const jtMs = jt.getTime()
        
        const diff = Math.floor((jtMs - todayMs) / (1000 * 60 * 60 * 24))
        g.daysDiff = diff

        if (diff < 0) {
          g.statusLabel = 'LEWAT'
        } else if (diff <= 7) {
          g.statusLabel = 'MENDEKATI'
        } else {
          g.statusLabel = 'AMAN'
        }
      }
    })

    return Object.values(groups).sort((a, b) => {
      if (b.billingMonth.getTime() !== a.billingMonth.getTime()) {
        return b.billingMonth.getTime() - a.billingMonth.getTime()
      }
      return a.supplier_name.localeCompare(b.supplier_name)
    })
  }, [data, todayMs])

  const filteredData = useMemo(() => {
    return groupedData.filter(g => {
      // Search
      const searchStr = search.toLowerCase()
      const matchSearch = g.supplier_name.toLowerCase().includes(searchStr) ||
                          g.items.some(i => i.nomor_faktur && i.nomor_faktur.toLowerCase().includes(searchStr))
      
      if (!matchSearch) return false

      // Filter month (using the group's billingMonth yyyy-mm format string)
      if (filterMonth) {
        const m = g.billingMonth.getMonth() + 1
        const y = g.billingMonth.getFullYear()
        const bMonthStr = `${y}-${m.toString().padStart(2, '0')}`
        if (bMonthStr !== filterMonth) {
          return false
        }
      }

      // Filter status
      if (filterStatus === 'MENDEKATI' && g.statusLabel !== 'MENDEKATI') return false
      if (filterStatus === 'LEWAT' && g.statusLabel !== 'LEWAT') return false

      return true
    })
  }, [groupedData, search, filterMonth, filterStatus])

  // Summaries based on FILTERED data
  const totalBelumDibayar = filteredData.reduce((s, i) => s + i.totalSisaHutang, 0)
  const totalMendekati = filteredData.filter(d => d.statusLabel === 'MENDEKATI').reduce((s, i) => s + i.totalSisaHutang, 0)
  const totalLewat = filteredData.filter(d => d.statusLabel === 'LEWAT').reduce((s, i) => s + i.totalSisaHutang, 0)

  // Get distinct billing months for filter
  const months = useMemo(() => {
    const m = new Set<string>()
    groupedData.forEach(g => {
      const mo = g.billingMonth.getMonth() + 1
      const y = g.billingMonth.getFullYear()
      m.add(`${y}-${mo.toString().padStart(2, '0')}`)
    })
    return Array.from(m).sort().reverse()
  }, [groupedData])

  const toggleGroup = (id: string) => {
    if (expandedGroupId === id) {
      setExpandedGroupId(null)
    } else {
      setExpandedGroupId(id)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-200 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-red-600" />
          Daftar Hutang Supplier
        </h2>
        <p className="text-sm text-gray-500">Pantau dan kelola tagihan bulanan dari supplier</p>
      </div>

      <div className="p-5 flex-1 flex flex-col min-h-0">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-red-100 rounded-lg text-red-600">
                <WalletCards className="w-4 h-4" />
              </span>
              <p className="text-sm font-medium text-red-900">Total Belum Dibayar</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{formatRupiah(totalBelumDibayar)}</p>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
              <p className="text-sm font-medium text-amber-900">Mendekati Jatuh Tempo</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{formatRupiah(totalMendekati)}</p>
            <p className="text-xs text-amber-600 mt-1">H-7 atau kurang</p>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-rose-100 rounded-lg text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <p className="text-sm font-medium text-rose-900">Lewat Jatuh Tempo</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">{formatRupiah(totalLewat)}</p>
            <p className="text-xs text-rose-600 mt-1">Melewati batas tanggal</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari supplier atau faktur..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">Semua Bulan Tagihan</option>
            {months.map(m => {
              const [y, mo] = m.split('-')
              const date = new Date(parseInt(y), parseInt(mo) - 1, 1)
              return (
                <option key={m} value={m}>
                  {date.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                </option>
              )
            })}
          </select>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="ALL">Semua Status JT</option>
            <option value="MENDEKATI">Mendekati Jatuh Tempo (H-7)</option>
            <option value="LEWAT">Lewat Jatuh Tempo</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-xl min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium w-10"></th>
                <th className="px-4 py-3 font-medium">Bulan Tagihan & Supplier</th>
                <th className="px-4 py-3 font-medium text-center">Jml Bon</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo Terdekat</th>
                <th className="px-4 py-3 font-medium text-right">Total Tagihan</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data hutang yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredData.map(group => (
                  <React.Fragment key={group.id}>
                    <tr 
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${expandedGroupId === group.id ? 'rotate-90 text-blue-600' : ''}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{group.supplier_name}</div>
                        <div className="text-xs text-blue-600 font-medium mt-0.5">Tagihan {group.billingMonthName}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {group.items.length}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {group.earliestJatuhTempo ? (
                          <div>
                            <div className="text-gray-900">{formatDate(group.earliestJatuhTempo)}</div>
                            {group.statusLabel === 'LEWAT' && (
                              <div className="text-xs text-rose-600 mt-0.5 font-medium">
                                Lewat {Math.abs(group.daysDiff!)} hari
                              </div>
                            )}
                            {group.statusLabel === 'MENDEKATI' && (
                              <div className="text-xs text-amber-600 mt-0.5 font-medium">
                                {group.daysDiff === 0 ? 'Hari ini' : `H-${group.daysDiff}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-red-600">
                        {formatRupiah(group.totalSisaHutang)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.statusLabel === 'LEWAT' && (
                          <span className="inline-flex px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-[11px] font-medium">
                            Lewat JT
                          </span>
                        )}
                        {group.statusLabel === 'MENDEKATI' && (
                          <span className="inline-flex px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[11px] font-medium">
                            Mendekati JT
                          </span>
                        )}
                        {group.statusLabel === 'AMAN' && (
                          <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium">
                            Belum JT
                          </span>
                        )}
                        {group.statusLabel === 'TIDAK_ADA' && (
                          <span className="inline-flex px-2 py-1 bg-gray-50 text-gray-400 rounded-md text-[11px]">
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    <tr className="bg-gray-50/50">
                      <td></td>
                      <td colSpan={5} className="p-0 border-none">
                        <div 
                          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                            expandedGroupId === group.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className={`px-4 py-3 bg-white/50 m-2 rounded-lg border border-gray-100 shadow-sm transition-opacity duration-300 ${
                              expandedGroupId === group.id ? 'opacity-100' : 'opacity-0'
                            }`}>
                              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Rincian Bon / Faktur</h4>
                              <table className="w-full text-xs text-left">
                                <thead className="text-gray-400 border-b border-gray-100">
                                  <tr>
                                    <th className="pb-2 font-medium">No Faktur</th>
                                    <th className="pb-2 font-medium">Tgl Bon</th>
                                    <th className="pb-2 font-medium">Jatuh Tempo Asli</th>
                                    <th className="pb-2 font-medium text-right">Nominal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {group.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 font-medium text-gray-700">{item.nomor_faktur || '-'}</td>
                                      <td className="py-2 text-gray-600">{formatDate(item.tanggal)}</td>
                                      <td className="py-2 text-gray-600">{item.tanggal_jatuh_tempo ? formatDate(item.tanggal_jatuh_tempo) : '-'}</td>
                                      <td className="py-2 text-right font-medium text-gray-900">{formatRupiah(item.sisa_hutang)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
