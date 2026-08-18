import { useState } from 'react'
import { Filter, ChevronDown, ChevronRight, X, ArrowUpDown } from 'lucide-react'

export interface FilterSection {
  key: string
  label: string
  type: 'checkbox' | 'radio'
  options: { value: string; label: string }[]
}

export interface FilterPopupProps {
  sections: FilterSection[]
  checkboxValues: Record<string, string[]>
  radioValues: Record<string, string>
  sortStok: 'ASC' | 'DESC' | ''
  onCheckboxChange: (key: string, value: string, checked: boolean) => void
  onRadioChange: (key: string, value: string) => void
  onSortStokChange: (val: 'ASC' | 'DESC' | '') => void
  onReset: () => void
  activeCount: number
}

export function FilterPopup({
  sections,
  checkboxValues,
  radioValues,
  sortStok,
  onCheckboxChange,
  onRadioChange,
  onSortStokChange,
  onReset,
  activeCount,
}: FilterPopupProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const toggle = (key: string) => setExpanded((prev) => (prev === key ? null : key))

  return (
    <div
      className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
      style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-500" />
          Filter Produk
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
        {sections.map((section) => {
          const isOpen = expanded === section.key
          const hasActive =
            section.type === 'checkbox'
              ? (checkboxValues[section.key] ?? []).length > 0
              : radioValues[section.key] && radioValues[section.key] !== 'ALL'
          return (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {section.label}
                  {hasActive && <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-3 space-y-2 bg-gray-50/60 pt-1">
                    {section.type === 'checkbox' &&
                      section.options.map((opt) => {
                        const checked = (checkboxValues[section.key] ?? []).includes(opt.value)
                        return (
                          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => onCheckboxChange(section.key, opt.value, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                              {opt.label}
                            </span>
                          </label>
                        )
                      })}
                    {section.type === 'radio' && (
                      <>
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="radio"
                            name={`radio-${section.key}`}
                            value="ALL"
                            checked={!radioValues[section.key] || radioValues[section.key] === 'ALL'}
                            onChange={() => onRadioChange(section.key, 'ALL')}
                            className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm text-gray-500 italic group-hover:text-gray-700 transition-colors">
                            Semua
                          </span>
                        </label>
                        {section.options.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="radio"
                              name={`radio-${section.key}`}
                              value={opt.value}
                              checked={radioValues[section.key] === opt.value}
                              onChange={() => onRadioChange(section.key, opt.value)}
                              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Stok Sort Section */}
        <div>
          <button
            onClick={() => toggle('_stok_sort')}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              Urut Stok
              {sortStok !== '' && <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />}
            </span>
            {expanded === '_stok_sort' ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              expanded === '_stok_sort' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-4 pb-3 space-y-2 bg-gray-50/60 pt-1">
                {[
                  { value: '', label: 'Default' },
                  { value: 'ASC', label: 'Stok Terkecil Dulu (Ascending)' },
                  { value: 'DESC', label: 'Stok Terbesar Dulu (Descending)' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="radio-stok-sort"
                      value={opt.value}
                      checked={sortStok === opt.value}
                      onChange={() => onSortStokChange(opt.value as 'ASC' | 'DESC' | '')}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
