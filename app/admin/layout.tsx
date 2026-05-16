import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

const ADMIN_EMAILS = ['general@silvaortiz.com.ar']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const email = session.user?.email ?? ''
  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    redirect('/expedientes')
  }

  return (
    <div className="min-h-screen bg-so-bg">
      <Header user={session.user} />
      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
