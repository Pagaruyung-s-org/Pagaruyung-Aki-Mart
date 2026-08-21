'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  contents: Record<string, React.ReactNode>
  rightContent?: React.ReactNode
}

export function Tabs({ tabs, defaultTab, contents, rightContent }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '')

  return (
    <div className="w-full">
      {/* Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.icon && <span className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
        {rightContent && (
          <div className="w-full sm:w-auto flex justify-end">
            {rightContent}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {contents[activeTab]}
      </div>
    </div>
  )
}
