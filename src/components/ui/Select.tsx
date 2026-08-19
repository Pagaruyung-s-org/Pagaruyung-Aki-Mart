'use client'

import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef, useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
  onChange?: (e: any) => void
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, placeholder, value, defaultValue, onChange, disabled, required, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    // Internal state for uncontrolled mode
    const [internalValue, setInternalValue] = useState<string | number | readonly string[] | undefined>(value ?? defaultValue ?? '')

    // Keep internal value in sync with controlled value prop if it changes
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleOutsideClick = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick)
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick)
      }
    }, [isOpen])

    // Find currently selected label
    const selectedOption = useMemo(() => options.find((opt) => opt.value === String(internalValue)), [options, internalValue])

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
      if (!searchTerm) return options
      return options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [options, searchTerm])

    const handleSelect = (val: string) => {
      if (onChange) {
        // Fake the event object to maintain compatibility with existing forms
        onChange({ target: { value: val, name: props.name, id: id } })
      }
      setInternalValue(val)
      setIsOpen(false)
      setSearchTerm('')
    }

    return (
      <div className="flex flex-col gap-1" ref={containerRef}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {/* Mock Select Button */}
          <div
            id={id}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              'w-full flex items-center justify-between bg-white rounded-lg border px-3 py-2 text-sm text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400',
              'transition-colors duration-150',
              error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
              className
            )}
          >
            <span className={cn('truncate', !selectedOption && 'text-gray-500')}>
              {selectedOption ? selectedOption.label : placeholder || '-- Pilih --'}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
          </div>

          {/* Hidden native select for form compatibility if needed */}
          <select
            ref={ref}
            value={internalValue}
            onChange={() => {}}
            className="hidden"
            name={props.name}
            disabled={disabled}
            {...props}
          >
            <option value="" disabled></option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Dropdown Panel */}
          {isOpen && (
            <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Search Box */}
              <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                <Search className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari..."
                  className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsOpen(false)
                  }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Options List */}
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-center text-gray-500">
                    Tidak ada hasil
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center',
                        opt.value === String(value)
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {opt.label}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
export { Select }
