import { getUserRole } from '@/actions/users'
import { redirect } from 'next/navigation'

export default async function RestrictedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getUserRole()
  
  if (role === 'ADMIN') {
    redirect('/dashboard')
  }
  
  return <>{children}</>
}
