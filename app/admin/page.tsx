import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { LoginForm } from '@/components/admin/LoginForm'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_session')?.value === 'authenticated'

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <AdminDashboard />
}
