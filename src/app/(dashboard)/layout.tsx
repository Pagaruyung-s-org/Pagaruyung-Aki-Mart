import { Sidebar } from '@/components/layout/Sidebar'
import { getUserRole } from '@/actions/users'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getUserRole()
  
  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-60">
        <Sidebar role={role} />
      </div>
      
      {/* Main Content Area */}
      <main className="pl-60 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
