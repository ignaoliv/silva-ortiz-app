import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { User, Mail } from 'lucide-react'
import { initials } from '@/lib/utils'
import PJNCredencialesForm from '@/components/perfil/PJNCredencialesForm'

export const metadata = { title: 'Mi Perfil · Silva Ortiz' }

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const user = session.user

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-so-text">Mi Perfil</h1>
        <p className="text-xs text-so-muted mt-0.5">Información de tu cuenta y configuraciones</p>
      </div>

      {/* Info del usuario */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-so-red flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {initials(user?.name ?? 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-so-text">{user?.name}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-so-muted">
              <Mail size={11} />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-so-muted">
              <User size={11} />
              <span>Cuenta Microsoft 365</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credenciales PJN */}
      <PJNCredencialesForm />

      <p className="text-[10px] text-so-muted text-center">
        Las credenciales del PJN se usan exclusivamente para sincronizar tus expedientes automáticamente cada noche.
      </p>
    </div>
  )
}
