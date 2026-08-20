'use client'

import { Modal } from '@/components/ui/Modal'
import { CheckCircle2, XCircle } from 'lucide-react'

interface OpnameDetailModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
}

export function OpnameDetailModal({ isOpen, onClose, session }: OpnameDetailModalProps) {
  if (!session) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getProductName = (p: any) => {
    if (!p) return '-'
    if (p.kategori === 'Air Aki') return p.merk
    return [p.merk, p.kategori, p.type, p.kode_baterai, `${p.kapasitas_ah}AH`].filter(Boolean).join(' ')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detail Sesi: ${session.kode_opname}`} size="3xl">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <p className="text-xs text-gray-500 font-medium">Tanggal</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{session.tanggal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Status</p>
            <div className="mt-1">
              {session.status === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Selesai
                </span>
              ) : session.status === 'EXPIRED' ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  <XCircle className="h-3 w-3" /> Kadaluarsa
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Berjalan
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Dimulai</p>
            <p className="text-sm text-gray-900 mt-1">{formatDate(session.started_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Selesai</p>
            <p className="text-sm text-gray-900 mt-1">{session.completed_at ? formatDate(session.completed_at) : '-'}</p>
          </div>
        </div>

        {/* Tabel Items */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Item Opname ({session.opname_items?.length || 0})</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Produk</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Snapshot</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Expected</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Fisik</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Selisih</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {session.opname_items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{getProductName(item.products)}</div>
                        <div className="text-xs font-mono text-gray-500">{item.products?.kode_produk}</div>
                      </td>
                      <td className="px-4 py-3 text-center">{item.system_qty_snapshot}</td>
                      <td className="px-4 py-3 text-center text-gray-400">{item.expected_qty ?? '-'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900">{item.physical_qty ?? '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {item.selisih === null || item.selisih === undefined ? '-' : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            item.selisih === 0 ? 'bg-gray-100 text-gray-600' :
                            item.selisih > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {item.selisih > 0 ? '+' : ''}{item.selisih}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-normal min-w-[200px]">
                        {item.keterangan || <span className="text-gray-400 italic">Tidak ada keterangan</span>}
                      </td>
                    </tr>
                  ))}
                  {(!session.opname_items || session.opname_items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada item</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}
