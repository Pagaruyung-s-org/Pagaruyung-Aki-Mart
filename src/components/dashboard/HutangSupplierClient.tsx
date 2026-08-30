'use client'

import { useState, useMemo } from 'react'
import { formatRupiah, formatDate } from '@/lib/utils'
import { AlertTriangle, Clock, WalletCards, ArrowDownRight, Search } from 'lucide-react'

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

export function HutangSupplierClient({ data }: HutangSupplierClientProps) {
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MENDEKATI' | 'LEWAT'>('ALL')
  const [search, setSearch] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  // Calculate status for each debt
  const processedData = useMemo(() => {
    return data.map(d => {
      let status: 'AMAN' | 'MENDEKATI' | 'LEWAT' | 'TIDAK_ADA' = 'TIDAK_ADA'
      let daysDiff = null

      if (d.tanggal_jatuh_tempo) {
        const jt = new Date(d.tanggal_jatuh_tempo)
        jt.setHours(0, 0, 0, 0)
        const jtMs = jt.getTime()
        
        daysDiff = Math.floor((jtMs - todayMs) / (1000 * 60 * 60 * 24))

        if (daysDiff < 0) {
          status = 'LEWAT'
        } else if (daysDiff <= 7) {
          status = 'MENDEKATI'
        } else {
          status = 'AMAN'
        }
      }

      return {
        ...d,
        statusLabel: status,
        daysDiff
      }
    })
  }, [data, todayMs])

  const filteredData = useMemo(() => {
    return processedData.filter(d => {
      // Search
      const searchStr = search.toLowerCase()
      const matchSearch = 
        d.supplier_name.toLowerCase().includes(searchStr) || 
        (d.nomor_faktur && d.nomor_faktur.toLowerCase().includes(searchStr))
      
      if (!matchSearch) return false

      // Filter month (based on tanggal)
      if (filterMonth) {
        // e.g. filterMonth = '2023-10'
        if (!d.tanggal.startsWith(filterMonth)) {
          return false
        }
      }

      // Filter status
      if (filterStatus === 'MENDEKATI' && d.statusLabel !== 'MENDEKATI') return false
      if (filterStatus === 'LEWAT' && d.statusLabel !== 'LEWAT') return false

      return true
    })
  }, [processedData, search, filterMonth, filterStatus])

  // Summaries based on FILTERED data
  const totalBelumDibayar = filteredData.reduce((s, i) => s + i.sisa_hutang, 0)
  const totalMendekati = filteredData.filter(d => d.statusLabel === 'MENDEKATI').reduce((s, i) => s + i.sisa_hutang, 0)
  const totalLewat = filteredData.filter(d => d.statusLabel === 'LEWAT').reduce((s, i) => s + i.sisa_hutang, 0)

  // Get distinct months for filter
  const months = useMemo(() => {
    const m = new Set<string>()
    data.forEach(d => {
      m.add(d.tanggal.substring(0, 7))
    })
    return Array.from(m).sort().reverse() // newest first
  }, [data])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-200 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-red-600" />
          Daftar Hutang Supplier
        </h2>
        <p className="text-sm text-gray-500">Pantau dan kelola hutang ke supplier yang belum lunas</p>
      </div>

      <div className="p-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari supplier atau faktur..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">Semua Bulan (Tgl Pembelian)</option>
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
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="ALL">Semua Status JT</option>
            <option value="MENDEKATI">Mendekati Jatuh Tempo (H-7)</option>
            <option value="LEWAT">Lewat Jatuh Tempo</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-auto border border-gray-200 rounded-xl h-[315px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Faktur & Supplier</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                <th className="px-4 py-3 font-medium text-right">Sisa Hutang</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data hutang yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredData.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {formatDate(row.tanggal)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.supplier_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{row.nomor_faktur || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.tanggal_jatuh_tempo ? (
                        <div>
                          <div className="text-gray-900">{formatDate(row.tanggal_jatuh_tempo)}</div>
                          {row.statusLabel === 'LEWAT' && (
                            <div className="text-xs text-rose-600 mt-0.5 font-medium">
                              Lewat {Math.abs(row.daysDiff!)} hari
                            </div>
                          )}
                          {row.statusLabel === 'MENDEKATI' && (
                            <div className="text-xs text-amber-600 mt-0.5 font-medium">
                              {row.daysDiff === 0 ? 'Hari ini' : `H-${row.daysDiff}`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="font-medium text-gray-900">{formatRupiah(row.sisa_hutang)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Total: {formatRupiah(row.total)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.statusLabel === 'LEWAT' && (
                        <span className="inline-flex px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-[11px] font-medium">
                          Lewat JT
                        </span>
                      )}
                      {row.statusLabel === 'MENDEKATI' && (
                        <span className="inline-flex px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[11px] font-medium">
                          Mendekati JT
                        </span>
                      )}
                      {row.statusLabel === 'AMAN' && (
                        <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium">
                          Belum JT
                        </span>
                      )}
                      {row.statusLabel === 'TIDAK_ADA' && (
                        <span className="inline-flex px-2 py-1 bg-gray-50 text-gray-400 rounded-md text-[11px]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
