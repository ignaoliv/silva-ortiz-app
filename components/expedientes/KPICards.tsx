'use client'
import { AlertTriangle, Calendar, Zap, CheckCircle, ChevronRight, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPIs {
  total: number
  activos: number
  en7dias: number
  audSemana: number
}

interface Props {
  kpis: KPIs
  hasPjn: boolean
  enNegociacion: number
  negociacionActive?: boolean
  onNegociacionClick?: () => void
}

export default function KPICards({ kpis, hasPjn, enNegociacion, negociacionActive, onNegociacionClick }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">

      {/* Vencimientos próximos */}
      <div className="card px-5 py-4 border-t-2 border-t-amber-600">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">
            Vencimientos<br />próximos
          </p>
          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={13} className="text-amber-400" />
          </div>
        </div>
        <p className="text-3xl font-light text-so-text tabular-nums">{kpis.en7dias}</p>
        <p className="text-[10px] text-so-muted mt-1">en los próximos 7 días</p>
      </div>

      {/* Audiencias próximas */}
      <div className="card px-5 py-4 border-t-2 border-t-blue-600">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">
            Audiencias<br />próximas
          </p>
          <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar size={13} className="text-blue-400" />
          </div>
        </div>
        <p className="text-3xl font-light text-so-text tabular-nums">{kpis.audSemana}</p>
        <p className="text-[10px] text-so-muted mt-1">esta semana</p>
      </div>

      {/* Novedades PJN */}
      <div className="card px-5 py-4 border-t-2 border-t-so-ash/60">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">
            Novedades<br />PJN
          </p>
          <div className="w-7 h-7 rounded-full bg-so-ash/10 flex items-center justify-center flex-shrink-0">
            <Zap size={13} className="text-so-ash" />
          </div>
        </div>
        {hasPjn ? (
          <>
            <p className="text-3xl font-light text-so-text tabular-nums">—</p>
            <a href="/pjn" className="text-[10px] text-so-ash hover:text-so-ashLight mt-1 flex items-center gap-0.5 transition-colors w-fit">
              Ver actuaciones <ChevronRight size={10} />
            </a>
          </>
        ) : (
          <>
            <p className="text-2xl font-light text-so-muted mt-1">Sin conectar</p>
            <a href="/perfil" className="text-[10px] text-so-ash hover:text-so-ashLight mt-1 flex items-center gap-0.5 transition-colors w-fit">
              Conectar PJN <ChevronRight size={10} />
            </a>
          </>
        )}
      </div>

      {/* Expedientes activos */}
      <div className="card px-5 py-4 border-t-2 border-t-emerald-600">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">
            Expedientes<br />activos
          </p>
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={13} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-3xl font-light text-so-text tabular-nums">{kpis.activos.toLocaleString('es-AR')}</p>
        <p className="text-[10px] text-so-muted mt-1">de {kpis.total.toLocaleString('es-AR')} totales</p>
      </div>

      {/* En negociación — clickeable */}
      <button
        type="button"
        onClick={onNegociacionClick}
        className={cn(
          'card px-5 py-4 border-t-2 border-t-purple-600 text-left w-full transition-all',
          negociacionActive
            ? 'ring-2 ring-purple-500/60 bg-purple-500/5'
            : 'hover:bg-so-surface/60'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">
            En<br />negociación
          </p>
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors', negociacionActive ? 'bg-purple-500/20' : 'bg-purple-500/10')}>
            <Handshake size={13} className="text-purple-400" />
          </div>
        </div>
        <p className="text-3xl font-light text-so-text tabular-nums">{enNegociacion}</p>
        <p className="text-[10px] text-so-muted mt-1">{negociacionActive ? 'click para ver todos' : 'casos en proceso de acuerdo'}</p>
      </button>

    </div>
  )
}
