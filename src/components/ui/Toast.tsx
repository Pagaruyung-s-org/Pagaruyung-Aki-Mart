'use client'

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  }

  const borders = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  }

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3.5 bg-white rounded-xl shadow-lg border border-gray-200 border-l-4 ${borders[toast.type]}
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
      `}
      style={{ animation: isExiting ? undefined : 'toast-slide-in 0.3s ease-out' }}
    >
      {icons[toast.type]}
      <p className="text-sm text-gray-800 font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        className="p-0.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <>
          <style>{`
            @keyframes toast-slide-in {
              from { opacity: 0; transform: translateX(100%); }
              to   { opacity: 1; transform: translateX(0); }
            }
          `}</style>
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-auto">
            {toasts.map(t => (
              <ToastItem key={t.id} toast={t} onRemove={removeToast} />
            ))}
          </div>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
