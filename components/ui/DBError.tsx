import { ServerCrash, RefreshCw } from 'lucide-react'

export default function DBError() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-10 text-center max-w-md w-full">
        <div className="w-14 h-14 rounded-full bg-red-950 border border-red-900 flex items-center justify-center mx-auto mb-6">
          <ServerCrash size={24} className="text-so-redLight" />
        </div>
        <p className="text-[10px] tracking-widest uppercase text-so-muted mb-3">Error de conexión</p>
        <h3 className="text-lg font-light text-so-text mb-3">
          Sin conexión a la base de datos
        </h3>
        <p className="text-sm text-so-subtle mb-2">
          Se intentó conectar <span className="text-so-textMid font-medium">2 veces</span> sin éxito.
        </p>
        <p className="text-xs text-so-muted mb-8 leading-relaxed">
          Verificá que{' '}
          <code className="bg-so-surface border border-so-border px-1.5 py-0.5 rounded text-so-textMid">
            DATABASE_URL
          </code>{' '}
          esté configurada en Vercel → Settings → Environment Variables.
        </p>
        <a
          href="."
          className="btn btn-primary inline-flex items-center gap-2 justify-center w-full py-2.5"
        >
          <RefreshCw size={13} />
          Reintentar conexión
        </a>
      </div>
    </div>
  )
}
