'use client'

import { useState, useEffect } from 'react'
import { Calendar, Search, TrendingUp, RefreshCw } from 'lucide-react'
import { getIncomingSalesFiltered } from '@/actions/kas-reports'
import { formatRupiah } from '@/lib/utils'

interface SalesData {
  accountId: string
  accountName: string
  masuk: number
  batal: number
  net: number
}

export function IncomingSalesFilterCard() {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SalesData[]>([])
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getIncomingSalesFiltered(startDate, endDate)
      if (result.success) {
        setData(result.data || [])
      } else {
        setError(result.error || 'Gagal memuat data')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  // Load initially
  useEffect(() => {
    fetchData()
  }, []) // Empty dependency array ensures it runs once on mount

  const totalNet = data.reduce((sum, item) => sum + item.net, 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Filter */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Kalkulasi Penjualan Masuk
          </h3>
          <p className="text-xs text-gray-500 mt-1">Total penjualan masuk per akun (net dari pembatalan)</p>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-700 font-medium"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-700 font-medium"
            />
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
            title="Filter Data"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        ) : loading && data.length === 0 ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-gray-300" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Summary */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800 mb-0.5">Total Penjualan Masuk (Semua Akun)</p>
                <p className="text-xs text-emerald-600/80">Pada rentang tanggal yang dipilih</p>
              </div>
              <p className="text-xl md:text-2xl font-bold text-emerald-700">{formatRupiah(totalNet)}</p>
            </div>

            {/* Breakdown per account */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rincian per Akun</p>
              {data.length === 0 ? (
                <div className="text-center p-4 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                  Tidak ada transaksi penjualan di rentang tanggal ini.
                </div>
              ) : (
                data.map((item) => (
                  <div key={item.accountId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-semibold text-gray-800">{item.accountName}</p>
                      {item.batal > 0 && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Masuk: {formatRupiah(item.masuk)} | Batal: <span className="text-red-500">-{formatRupiah(item.batal)}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatRupiah(item.net)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
