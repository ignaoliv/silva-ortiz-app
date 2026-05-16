'use client'
import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncResult {
  results: {
    audiencias:   { created: number; updated: number; errors: number }
    vencimientos: { created: number; updated: number; errors: number }
  }
  sincronizados: { audiencias: number; vencimientos: number }
}

export default function CalendarSyncWidget() {
  const [conectado,  setConectado]  = useState<boolean | null>(null)
  const [syncing,    setSyncing]    = useState(false)
  const [resultado,  setResultado]  = useState<SyncResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/calendar/sync')
      .then(r => r.json())
      .then(d => setConectado(d.conectado))
      .catch(() => setConectado(false))
  }, [])

  async function handleSync() {
    setSyncing(true)
    setResultado(null)
    setError(null)
    try {
      const res  = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Error desconocido')
      } else {
        setResultado(data)
      }
    } catch {
      setError('No se pudo conectar con el servidor')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-so-text">Microsoft Calendar</p>
            <p className="text-xs text-so-muted">Audiencias y vencimientos en tu agenda</p>
          </div>
        </div>

        {/* Estado */}
        {conectado === null ? (
          <div className="w-4 h-4 rounded-full bg-so-border animate-pulse" />
        ) : conectado ? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Conectado
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Sin permisos
          </span>
        )}
      </div>

      {/* Sin permisos: instrucción */}
      {conectado === false && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-300 space-y-1">
          <p className="font-medium">Se necesita reconectar la cuenta</p>
          <p className="text-amber-400/80">
            Cerrá sesión y volvé a entrar — Microsoft pedirá permiso para acceder al calendario.
          </p>
        </div>
      )}

      {/* Botón sync */}
      {conectado && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold transition-all border',
            syncing
              ? 'bg-so-surface border-so-border text-so-muted cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 border-blue-600 text-white'
          )}
          style={{ borderRadius: 4 }}
        >
          <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={13} />
            Sincronización completada
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-so-textMid">
            <div className="space-y-0.5">
              <p className="font-medium text-so-text">Audiencias</p>
              <p>{resultado.results.audiencias.created} creadas · {resultado.results.audiencias.updated} actualizadas</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-medium text-so-text">Vencimientos</p>
              <p>{resultado.results.vencimientos.created} creados · {resultado.results.vencimientos.updated} actualizados</p>
            </div>
          </div>
          <p className="text-[10px] text-so-muted">
            {resultado.sincronizados.audiencias} audiencias · {resultado.sincronizados.vencimientos} vencimientos procesados
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-400">
          <XCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-[11px] text-so-muted">
        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-so-muted" />
        <p>Se sincronizan audiencias futuras y vencimientos de los próximos 60 días. Los eventos aparecen con la categoría <span className="text-so-textMid font-medium">Silva Ortiz</span> en tu calendario.</p>
      </div>
    </div>
  )
}
