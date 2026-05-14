import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import PjnSetupModal from '@/components/pjn/PjnSetupModal'
import { hasPjnCredentials } from '@/lib/queries'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const hasPjn = await hasPjnCredentials(session.user?.email ?? '').catch(() => true)

  return (
    <div className="min-h-screen bg-so-bg">
      <Header user={session.user} />
      {!hasPjn && <PjnSetupModal />}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  )
}
