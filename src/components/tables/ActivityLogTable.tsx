'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'

export function ActivityLogTable({ 
  logs, 
  totalItems, 
  currentPage, 
  pageSize,
  users
}: { 
  logs: any[], 
  totalItems: number,
  currentPage: number,
  pageSize: number,
  users: any[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedLog, setSelectedLog] = useState<any>(null)
  const totalPages = Math.ceil(totalItems / pageSize) || 1

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // reset to page 1 on filter change
    params.set('page', '1')
    router.push(pathname + '?' + params.toString())
  }

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(pathname + '?' + params.toString())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Aksi</label>
          <select 
            className={`border border-gray-300 rounded-lg text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] ${!searchParams.get('action') ? 'text-gray-400' : 'text-gray-900'}`}
            value={searchParams.get('action') || ''}
            onChange={(e) => updateFilter('action', e.target.value)}
          >
            <option value="" className="text-gray-500">Semua Aksi</option>
            <option value="void_penjualan" className="text-gray-900">Void Penjualan</option>
            <option value="void_pembelian" className="text-gray-900">Void Pembelian</option>
            <option value="void_operasional" className="text-gray-900">Void Operasional</option>
            <option value="void_pembayaran_hutang" className="text-gray-900">Void Pembayaran Hutang</option>
            <option value="tambah_produk" className="text-gray-900">Tambah Produk</option>
            <option value="edit_produk" className="text-gray-900">Edit Produk</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">User Pelaku</label>
          <select 
            className={`border border-gray-300 rounded-lg text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] ${!searchParams.get('userId') ? 'text-gray-400' : 'text-gray-900'}`}
            value={searchParams.get('userId') || ''}
            onChange={(e) => updateFilter('userId', e.target.value)}
          >
            <option value="" className="text-gray-500">Semua User</option>
            {users.map(u => (
              <option key={u.id} value={u.id} className="text-gray-900">{u.full_name} ({u.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mulai Tanggal</label>
          <input 
            type="date"
            className={`border border-gray-300 rounded-lg text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!searchParams.get('startDate') ? 'text-gray-400' : 'text-gray-900'}`}
            value={searchParams.get('startDate') || ''}
            onChange={(e) => updateFilter('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input 
            type="date"
            className={`border border-gray-300 rounded-lg text-sm bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!searchParams.get('endDate') ? 'text-gray-400' : 'text-gray-900'}`}
            value={searchParams.get('endDate') || ''}
            onChange={(e) => updateFilter('endDate', e.target.value)}
          />
        </div>
        <div className="ml-auto">
          <button 
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium shadow-sm"
          >
            Reset Filter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Pelaku</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entitas ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Alasan</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!logs || logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">Belum ada riwayat aktivitas</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {log.users?.full_name || 'System / Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{log.entity_id.substring(0,8)}...</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate" title={log.reason}>
                    {log.reason || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalItems > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          setPageSize={() => {}} // fixed page size for server side pagination for now
          goToNextPage={() => setPage(Math.min(totalPages, currentPage + 1))}
          goToPrevPage={() => setPage(Math.max(1, currentPage - 1))}
          setCurrentPage={setPage}
        />
      )}

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detail Log Aktivitas"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Aksi</p>
                <p className="font-medium text-gray-900">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Entitas</p>
                <p className="font-medium text-gray-900">{selectedLog.entity_type} ({selectedLog.entity_id})</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Pelaku</p>
                <p className="font-medium text-gray-900">{selectedLog.users?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Waktu</p>
                <p className="font-medium text-gray-900">{formatDateTime(selectedLog.created_at)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Alasan</p>
                <p className="text-gray-900 bg-white p-3 border border-gray-200 rounded-md whitespace-pre-wrap">
                  {selectedLog.reason || '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedLog.old_value && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Data Lama (old_value)</p>
                  <div className="bg-gray-900 p-4 rounded-xl overflow-auto max-h-[300px]">
                    <pre className="text-xs text-gray-300 font-mono">
                      {JSON.stringify(selectedLog.old_value, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {selectedLog.new_value && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Data Baru (new_value)</p>
                  <div className="bg-gray-900 p-4 rounded-xl overflow-auto max-h-[300px]">
                    <pre className="text-xs text-green-400 font-mono">
                      {JSON.stringify(selectedLog.new_value, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {!selectedLog.old_value && !selectedLog.new_value && (
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Data Snapshot</p>
                  <div className="bg-gray-100 p-4 rounded-xl">
                    <p className="text-gray-500 text-sm italic">Tidak ada snapshot data.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
