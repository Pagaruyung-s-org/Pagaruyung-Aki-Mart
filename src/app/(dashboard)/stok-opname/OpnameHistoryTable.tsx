'use client'

import { useState } from 'react'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { CheckCircle2, Clock, XCircle, Eye } from 'lucide-react'
import { OpnameDetailModal } from './OpnameDetailModal'
import { getSessionDetail } from '@/actions/stok-opname'
import { useToast } from '@/components/ui/Toast'

export function OpnameHistoryTable({ history }: { history: any[] }) {
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalItems,
    goToNextPage,
    goToPrevPage
  } = usePagination(history, 10)

  const handleViewDetail = async (sessionId: string) => {
    setIsLoading(true)
    try {
      const data = await getSessionDetail(sessionId)
      if (data) {
        setSelectedSession(data)
        setIsModalOpen(true)
      } else {
        showToast('error', 'Gagal memuat detail sesi')
      }
    } catch (e) {
      showToast('error', 'Terjadi kesalahan jaringan')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Kode Sesi</th>
              <th className="px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-center">Jml Produk</th>
              <th className="px-4 py-3 font-medium text-gray-600">Waktu Selesai</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Belum ada riwayat stok opname
                </td>
              </tr>
            ) : (
              currentData.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                    {session.kode_opname}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(session.tanggal)}
                  </td>
                  <td className="px-4 py-3">
                    {session.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                      </span>
                    ) : session.status === 'CANCELLED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="h-3.5 w-3.5" /> Batal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        <XCircle className="h-3.5 w-3.5" /> Kadaluarsa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">
                    {session.opname_items?.[0]?.count || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {session.completed_at ? (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(session.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleViewDetail(session.id)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Eye className="h-3.5 w-3.5" /> Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          setPageSize={setPageSize}
          goToNextPage={goToNextPage}
          goToPrevPage={goToPrevPage}
          setCurrentPage={setCurrentPage}
        />
      )}

      <OpnameDetailModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedSession(null) }}
        session={selectedSession}
      />
    </div>
  )
}
