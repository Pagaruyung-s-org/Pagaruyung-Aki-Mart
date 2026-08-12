'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? 'User')
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40 relative">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 text-sm transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-100 mb-2">
                  <p className="text-xs text-gray-500">Masuk sebagai</p>
                  <p className="text-sm font-semibold text-gray-900 truncate" title={userEmail || ''}>
                    {userEmail || 'Memuat...'}
                  </p>
                </div>
                <div className="px-2">
                  <button
                    onClick={() => {
                      setShowProfile(false)
                      setShowLogoutModal(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Validation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Konfirmasi Keluar</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Apakah Anda yakin ingin keluar dari sistem? Anda harus masuk kembali untuk mengakses data.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 shadow-sm transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
