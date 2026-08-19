import { getUserRole } from '@/actions/users'
import { redirect } from 'next/navigation'

export default async function ClosingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getUserRole()
  
  // Admin & Owner allowed
  if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role || '')) {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}
