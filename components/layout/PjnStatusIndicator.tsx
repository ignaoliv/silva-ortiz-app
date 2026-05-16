'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import PjnIcon from '@/components/ui/PjnIcon'
import { cn, fmtDateTime } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PjnStatus {
  conectado:          boolean
  sincronizando:      boolean
  estadoUltimoSync:   'ok' | 'error' | null
  fechaUltimoSync:    string | null
  horasDesdeSync:     number | null
  actuacionesNew:     number
}

// ── Lógica de color ───────────────────────────────────────────────────────────

type SemaforoColor = 'verde' | 'naranja' | 'rojo'

function getSemaforo(s: PjnStatus): SemaforoColor {
  if (!s.conectado) return 'rojo'
  if (s.estadoUltimoSync === 'ok' && s.horasDesdeSync !== null && s.horasDesdeSync <= 24) return 'verde'
  return 'naranja'
}

const COLOR_MAP: Record<SemaforoColor, {
  ring:    string   // borde del círculo del logo
  dot:     string   // punto chico
  icon:    string   // color del SVG
  pulse:   string   // animación ping
  label:   string
  tooltip: string
}> = {
  verde: {
    ring:    'ring-2 ring-emerald-500',
    dot:     'bg-emerald-500',
    icon:    'text-emerald-400',
    pulse:   'bg-emerald-400',
    label:   'Conectado',
    tooltip: 'PJN sincronizado correctamente',
  },
  naranja: {
    ring:    'ring-2 ring-amber-500',
    dot:     'bg-amber-500',
    icon:    'text-amber-400',
    pulse:   'bg-amber-400',
    label:   'Sin sincronizar',
    tooltip: 'La última sincronización falló o fue hace más de 24 h',
  },
  rojo: {
    ring:    'ring-2 ring-red-500',
    dot:     'bg-red-500',
    icon:    'text-red-400',
    pulse:   'bg-red-400',
    label:   'Sin conectar',
    tooltip: 'No hay credenciales PJN configuradas',
  },
}

function fmtRelative(horasDesdeSync: number | null, fecha: string | null): string {
  if (!fecha) return 'Nunca sincronizado'
  if (horasDesdeSync === null) return ''
  const h = Math.round(horasDesdeSync)
  if (h < 1) return 'Hace menos de 1 h'
  if (h === 1) return 'Hace 1 h'
  if (h < 24) return `Hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'Hace 1 día' : `Hace ${d} días`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PjnStatusIndicator() {
  const [status,   setStatus]   = useState<PjnStatus | null>(null)
  const [open,     setOpen]     = useState(false)
  const [syncing,  setSyncing]  = useState(false)
  const [syncDone, setSyncDone] = useState<'ok' | 'error' | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pjn/sync-status')
      if (!res.ok) return
      const data: PjnStatus = await res.json()
      setStatus(data)
      if (syncing && !data.sincronizando) {
        setSyncing(false)
        setSyncDone(data.estadoUltimoSync)
        stopPoll()
        setTimeout(() => setSyncDone(null), 4000)
      }
    } catch { /* silencio */ }
  }, [syncing, stopPoll])

  const startPoll = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(fetchStatus, 3000)
  }, [fetchStatus])

  useEffect(() => { fetchStatus() }, [])

  useEffect(() => {
    if (status?.sincronizando && !syncing) {
      setSyncing(true)
      startPoll()
    }
  }, [status?.sincronizando])

  useEffect(() => () => stopPoll(), [])

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function handleSync(e: React.MouseEvent) {
    e.stopPropagation()
    if (syncing) return
    setSyncing(true)
    setSyncDone(null)
    try {
      await fetch('/api/pjn/sync', { method: 'POST' })
      startPoll()
    } catch {
      setSyncing(false)
      setSyncDone('error')
      setTimeout(() => setSyncDone(null), 3000)
    }
  }

  const semaforo = status ? getSemaforo(status) : null
  const cm       = semaforo ? COLOR_MAP[semaforo] : null

  // ── Logo circular con ring de color ──────────────────────────────────────────
  const LogoCircle = (
    <div className="relative flex-shrink-0">
      {/* Círculo con ícono + ring de color */}
      <div className={cn(
        'w-7 h-7 rounded-full bg-so-surface flex items-center justify-center transition-all',
        syncing
          ? 'ring-2 ring-so-border animate-pulse'
          : cm?.ring ?? 'ring-2 ring-so-border'
      )}>
        <PjnIcon
          size={15}
          className={cn(
            'transition-colors',
            syncing ? 'text-so-muted' : (cm?.icon ?? 'text-so-muted')
          )}
        />
      </div>

      {/* Punto de estado (abajo-derecha del círculo) */}
      {!syncing && semaforo && (
        <span className="absolute -bottom-0.5 -right-0.5 flex">
          <span className={cn('block w-2 h-2 rounded-full border border-so-bg', cm!.dot)} />
          {semaforo === 'verde' && (
            <span className={cn(
              'absolute inset-0 rounded-full opacity-70 animate-ping',
              cm!.pulse
            )} />
          )}
        </span>
      )}

      {/* Spinner de sync */}
      {syncing && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <RefreshCw size={10} className="text-so-ash animate-spin" />
        </span>
      )}
    </div>
  )

  return (
    <div ref={panelRef} className="relative flex-shrink-0">

      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={cm?.tooltip ?? 'Estado PJN'}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded transition-colors hover:bg-so-surface',
          open && 'bg-so-surface'
        )}
      >
        {LogoCircle}
        <span className="text-[10px] font-medium text-so-muted hidden lg:block tracking-wide">
          PJN
        </span>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-so-card border border-so-border shadow-2xl z-50 overflow-hidden" style={{ borderRadius: 2 }}>

          {/* Header del panel */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-so-border bg-so-surface/50">
            {/* Logo más grande en el panel */}
            <div className={cn(
              'w-9 h-9 rounded-full bg-so-surface/80 flex items-center justify-center flex-shrink-0',
              cm?.ring ?? 'ring-2 ring-so-border'
            )}>
              <PjnIcon size={19} className={cm?.icon ?? 'text-so-muted'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-so-text leading-tight">Poder Judicial de la Nación</p>
              <p className="text-[10px] text-so-muted">Portal PJN</p>
            </div>
            {/* Badge estado */}
            {semaforo && (
              <span className={cn(
                'flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wide flex-shrink-0',
                semaforo === 'verde'   && 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
                semaforo === 'naranja' && 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                semaforo === 'rojo'    && 'bg-red-500/15 border-red-500/30 text-red-400',
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cm!.dot)} />
                {cm!.label}
              </span>
            )}
          </div>

          {/* Info rows */}
          <div className="px-4 py-3 space-y-2.5">
            {status && (
              <>
                <div className="flex items-center gap-2 text-[11px]">
                  {status.conectado
                    ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                    : <XCircle      size={12} className="text-red-400 flex-shrink-0" />
                  }
                  <span className="text-so-textMid">
                    {status.conectado ? 'Credenciales configuradas' : 'Sin credenciales'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <Clock size={12} className="text-so-muted flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-so-textMid">
                      {status.sincronizando
                        ? 'Sincronizando ahora...'
                        : fmtRelative(status.horasDesdeSync, status.fechaUltimoSync)
                      }
                    </span>
                    {!status.sincronizando && status.fechaUltimoSync && (
                      <span className="text-[10px] text-so-muted font-mono">
                        {fmtDateTime(status.fechaUltimoSync)}
                      </span>
                    )}
                  </div>
                </div>

                {status.estadoUltimoSync && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {status.estadoUltimoSync === 'ok'
                      ? <CheckCircle2  size={12} className="text-emerald-400 flex-shrink-0" />
                      : <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                    }
                    <span className="text-so-textMid">
                      {status.estadoUltimoSync === 'ok'
                        ? `Sync exitosa${status.actuacionesNew > 0 ? ` · ${status.actuacionesNew} novedades` : ''}`
                        : 'Última sync con error'
                      }
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Resultado inline */}
            {syncDone && (
              <div className={cn(
                'flex items-center gap-2 px-2.5 py-2 text-[11px] border',
                syncDone === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              )}>
                {syncDone === 'ok'
                  ? <><CheckCircle2 size={12} /> Sincronización completada</>
                  : <><XCircle size={12} /> La sincronización falló</>
                }
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
            {status?.conectado && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold transition-all border',
                  syncing
                    ? 'bg-so-surface border-so-border text-so-muted cursor-not-allowed'
                    : 'bg-so-ash hover:bg-so-ashLight border-so-ash text-white'
                )}
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                {syncing ? (
                  <span className="flex items-center gap-1.5">
                    Sincronizando
                    <span className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 h-1 bg-so-muted rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </span>
                  </span>
                ) : 'Actualizar ahora'}
              </button>
            )}

            {!status?.conectado && (
              <a href="/perfil" onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center py-2.5 text-[12px] font-semibold bg-so-ash hover:bg-so-ashLight text-white transition-colors"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Conectar cuenta PJN
              </a>
            )}

            <a href="/pjn" onClick={() => setOpen(false)}
              className="w-full text-center text-[11px] text-so-muted hover:text-so-textMid transition-colors py-1"
            >
              Ver expedientes PJN →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
