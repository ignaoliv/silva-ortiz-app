'use client'
import { useState } from 'react'
import { AlertTriangle, Calendar, Zap, ExternalLink, ChevronRight } from 'lucide-react'
import type { DBCaso, DBAudiencia } from '@/lib/queries'
import { diffDays, fmtDateShort, cn } from '@/lib/utils'

// ── Vencimientos tab ──────────────────────────────────────────────────────────

function urgencyLeft(days: number) {
  if (days < 0)  return 'border-l-2 border-red-600'
  if (days <= 3) return 'border-l-2 border-red-700'
  if (days <= 7) return 'border-l-2 border-amber-600'
  return 'border-l-2 border-so-border'
}
function urgencyText(days: number) {
  if (days < 0)  return 'text-red-400 font-medium'
  if (days <= 3) return 'text-red-400'
  if (days <= 7) return 'text-amber-400'
  return 'text-so-muted'
}
function diffLabel(days: number) {
  if (days < 0)  return `Hace ${Math.abs(days)}d`
  if (days === 0) return 'Hoy'
  return `${days}d`
}

interface VencItem extends DBCaso { diff: number }

function VencGroup({ title, items }: { title: string; items: VencItem[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="px-4 py-2 text-[9px] font-bold tracking-[0.18em] uppercase text-so-muted bg-so-surface/60 border-b border-so-border">
        {title}
      </p>
      {items.map(c => {
        const fecha = fmtDateShort(c.vencimiento!)
        return (
          <div key={c.id} className={cn('px-4 py-3 pl-3 border-b border-so-border/50', urgencyLeft(c.diff))}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-so-muted font-mono mb-0.5">{c.nro}</p>
                <p className="text-xs text-so-text truncate leading-snug">{c.caratula}</p>
                <p className="text-[10px] text-so-subtle mt-0.5">{c.clienteNombre}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-light text-so-text leading-none">{fecha.day}</p>
                <p className="text-[10px] text-so-subtle">{fecha.mon}</p>
                <p className={cn('text-[10px] mt-1', urgencyText(c.diff))}>{diffLabel(c.diff)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TabVencimientos({ casos }: { casos: DBCaso[] }) {
  const items: VencItem[] = casos
    .filter(c => c.vencimiento && !c.cerrado)
    .map(c => ({ ...c, diff: diffDays(c.vencimiento!) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 20)

  const vencidos  = items.filter(c => c.diff < 0)
  const hoy       = items.filter(c => c.diff === 0)
  const proximos7 = items.filter(c => c.diff > 0 && c.diff <= 7)
  const resto     = items.filter(c => c.diff > 7)

  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-so-muted">Sin vencimientos registrados</p>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      <VencGroup title="Vencidos" items={vencidos} />
      <VencGroup title="Hoy" items={hoy} />
      <VencGroup title="Próximos 7 días" items={proximos7} />
      <VencGroup title="Próximos" items={resto} />
    </div>
  )
}

// ── Audiencias tab ────────────────────────────────────────────────────────────

function TabAudiencias({ audiencias }: { audiencias: DBAudiencia[] }) {
  const hoy = new Date().toISOString().split('T')[0]
  const upcoming = audiencias
    .filter(a => a.fecha >= hoy && a.estado !== 'Cancelada')
    .slice(0, 15)

  if (upcoming.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-so-muted">Sin audiencias próximas</p>
    )
  }

  return (
    <div className="overflow-y-auto flex-1 divide-y divide-so-border/50">
      {upcoming.map(a => {
        const diff = diffDays(a.fecha)
        const isHoy = diff === 0
        const esMañana = diff === 1
        const label = diff < 0 ? `Hace ${Math.abs(diff)}d` : isHoy ? 'Hoy' : esMañana ? 'Mañana' : `${diff}d`
        const labelColor = diff <= 0 ? 'text-red-400' : diff === 1 ? 'text-amber-400' : 'text-so-muted'
        const parts = a.fecha.split('-')
        return (
          <div key={a.id} className="px-4 py-3 border-l-2 border-blue-700">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-so-muted mb-0.5">{a.tipo} · {a.hora}h</p>
                <p className="text-xs text-so-text truncate leading-snug">{a.caratula}</p>
                <p className="text-[10px] text-so-subtle mt-0.5">{a.lugar}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-light text-so-text leading-none">{parts[2]}</p>
                <p className="text-[10px] text-so-subtle capitalize">
                  {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}
                </p>
                <p className={cn('text-[10px] mt-1', labelColor)}>{label}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Novedades PJN tab ─────────────────────────────────────────────────────────

function TabPjn({ hasPjn }: { hasPjn: boolean }) {
  if (!hasPjn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
        <div className="w-10 h-10 rounded-full bg-so-ash/15 flex items-center justify-center">
          <Zap size={18} className="text-so-ash" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-so-text">Conectá el PJN</p>
          <p className="text-[11px] text-so-muted leading-relaxed">
            Sincronizamos actuaciones y novedades automáticamente.
          </p>
        </div>
        <a href="/perfil" className="text-[11px] text-so-ash hover:text-so-ashLight font-semibold flex items-center gap-1 transition-colors">
          Conectar cuenta <ChevronRight size={12} />
        </a>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10 text-center">
      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-so-text">Sincronizado</p>
        <p className="text-[11px] text-so-muted">
          Las novedades aparecen en la sección PJN.
        </p>
        <a href="/pjn" className="text-[11px] text-so-ash hover:text-so-ashLight font-semibold flex items-center justify-center gap-1 mt-2 transition-colors">
          Ver PJN <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  casos: DBCaso[]
  audiencias: DBAudiencia[]
  hasPjn: boolean
}

const TABS = [
  { key: 'vencimientos', label: 'Vencimientos', icon: AlertTriangle },
  { key: 'audiencias',   label: 'Audiencias',   icon: Calendar },
  { key: 'pjn',         label: 'PJN',           icon: Zap },
] as const
type TabKey = typeof TABS[number]['key']

export default function AgendaLegal({ casos, audiencias, hasPjn }: Props) {
  const [tab, setTab] = useState<TabKey>('vencimientos')

  // Counts for tab badges
  const vencProximos = casos.filter(c => c.vencimiento && !c.cerrado && diffDays(c.vencimiento) <= 7).length
  const audProximas  = audiencias.filter(a => {
    const diff = diffDays(a.fecha)
    return diff >= 0 && diff <= 7 && a.estado !== 'Cancelada'
  }).length

  const counts: Record<TabKey, number> = {
    vencimientos: vencProximos,
    audiencias:   audProximas,
    pjn:          0,
  }

  return (
    <div className="card flex flex-col" style={{ minHeight: '420px' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-muted mb-3">
          Agenda legal
        </p>
        {/* Tab strip */}
        <div className="flex gap-0 border-b border-so-border">
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-so-red text-so-text'
                    : 'border-transparent text-so-muted hover:text-so-textMid'
                )}
              >
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={cn(
                    'text-[9px] font-bold px-1 py-0.5 rounded-full leading-none',
                    active ? 'bg-so-red text-white' : 'bg-so-border text-so-muted'
                  )}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {tab === 'vencimientos' && <TabVencimientos casos={casos} />}
        {tab === 'audiencias'   && <TabAudiencias audiencias={audiencias} />}
        {tab === 'pjn'          && <TabPjn hasPjn={hasPjn} />}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-so-border bg-so-surface/30">
        <a
          href="/audiencias"
          className="text-[10px] text-so-muted hover:text-so-textMid flex items-center gap-1 transition-colors w-fit"
        >
          Ver agenda completa <ChevronRight size={10} />
        </a>
      </div>
    </div>
  )
}
