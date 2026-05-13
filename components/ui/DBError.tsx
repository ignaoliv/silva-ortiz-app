import { ServerCrash, RefreshCw } from 'lucide-react'

export default function DBError() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ServerCrash size={30} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Sin conexión a la base de datos
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          Se intentó conectar <strong>2 veces</strong> sin éxito.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Verificá que la variable{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">DATABASE_URL</code>{' '}
          esté configurada correctamente en Vercel → Settings → Environment Variables.
        </p>
        <a
          href="."
          className="btn btn-primary inline-flex items-center gap-2 justify-center w-full"
        >
          <RefreshCw size={14} />
          Reintentar conexión
        </a>
      </div>
    </div>
  )
}
