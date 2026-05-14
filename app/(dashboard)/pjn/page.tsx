import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPjnExpedientes, getPjnSyncLog } from '@/lib/queries'
import PjnExpedientesList from '@/components/pjn/PjnExpedientesList'
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PjnPage() {
  const session     = await getServerSession(authOptions)
  const email       = session?.user?.email ?? ''
  const expedientes = await getPjnExpedientes(email)
  const syncLog     = await getPjnSyncLog()
  const lastSync    = syncLog[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-so-text tracking-tight">
            Poder Judicial de la Nación
          </h1>
          <p className="text-xs text-so-muted mt-0.5">
            Expedientes y actuaciones sincronizadas automáticamente
          </p>
        </div>

        {/* Último sync */}
        {lastSync && (
          <div className="flex items-center gap-2 bg-so-card border border-so-border rounded-lg px-4 py-2.5">
            <RefreshCw size={13} className="text-so-muted" />
            <div className="text-right">
              <p className="text-[10px] text-so-muted uppercase tracking-wider">Última sync</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {lastSync.estado === 'ok'
                  ? <CheckCircle2 size={12} className="text-emerald-400" />
                  : lastSync.estado === 'error'
                    ? <XCircle size={12} className="text-red-400" />
                    : <Clock size={12} className="text-yellow-400" />
                }
                <span className="text-xs font-medium text-so-text">
                  {lastSync.fechaInicio}
                </span>
                <span className="text-[10px] text-so-muted">
                  · {lastSync.expedientes} exp · {lastSync.actuacionesNew} nuevas
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sin credenciales */}
      {expedientes.length === 0 && (
        <div className="bg-so-card border border-so-border rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-so-surface flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={20} className="text-so-muted" />
          </div>
          <p className="text-sm font-medium text-so-text">Sin expedientes sincronizados</p>
          <p className="text-xs text-so-muted mt-1 max-w-sm mx-auto">
            Configurá tus credenciales del PJN en{' '}
            <a href="/perfil" className="text-so-red hover:underline">Mi perfil</a>
            {' '}para comenzar la sincronización nocturna.
          </p>
        </div>
      )}

      {/* Lista de expedientes */}
      {expedientes.length > 0 && (
        <PjnExpedientesList expedientes={expedientes} />
      )}
    </div>
  )
}
