import { getFeedback } from '@/lib/queries'
import { checkDB } from '@/lib/db'
import DBError from '@/components/ui/DBError'
import AdminFeedbackPanel from '@/components/admin/AdminFeedbackPanel'

export const metadata = { title: 'Admin · Silva Ortiz' }

export default async function AdminPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const feedback = await getFeedback()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-so-muted mb-1">
          Panel de administración
        </p>
        <h1 className="text-2xl font-semibold text-so-text" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          Mensajes de feedback
        </h1>
        <p className="text-sm text-so-muted mt-1">
          Mensajes enviados por los usuarios del sistema.
        </p>
      </div>

      <AdminFeedbackPanel feedback={feedback} />
    </div>
  )
}
