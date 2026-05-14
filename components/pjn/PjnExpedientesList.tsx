'use client'

import { useState } from 'react'
import type { DBPjnExpediente } from '@/lib/queries'
import PjnActuacionesPanel from './PjnActuacionesPanel'
import PjnResumen from './PjnResumen'
import { ChevronDown, ChevronRight, ExternalLink, LinkIcon } from 'lucide-react'

interface Props {
  expedientes: DBPjnExpediente[]
}

const SITUACION_COLOR: Record<string, string> = {
  activo:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archivado: 'bg-so-surface text-so-muted border-so-border',
  paralizado:'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

function situacionColor(s: string) {
  const k = s.toLowerCase()
  for (const [key, cls] of Object.entries(SITUACION_COLOR)) {
    if (k.includes(key)) return cls
  }
  return 'bg-so-surface text-so-muted border-so-border'
}

export default function PjnExpedientesList({ expedientes }: Props) {
  const [expanded, setExpanded] = useState<number | null>(
    expedientes.length === 1 ? expedientes[0].id : null
  )

  return (
    <div className="space-y-2">
      {expedientes.map(exp => (
        <div key={exp.id} className="bg-so-card border border-so-border rounded-xl overflow-hidden">
          {/* Cabecera del expediente */}
          <button
            onClick={() => setExpanded(expanded === exp.id ? null : exp.id)}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-so-surface/50 transition-colors text-left"
          >
            <div className="text-so-muted flex-shrink-0">
              {expanded === exp.id
                ? <ChevronDown size={15} />
                : <ChevronRight size={15} />
              }
            </div>

            {/* Número */}
            <div className="flex-shrink-0 min-w-[140px]">
              <p className="text-xs font-mono font-semibold text-so-text">{exp.nro}</p>
              <p className="text-[10px] text-so-muted mt-0.5">{exp.dependencia}</p>
            </div>

            {/* Carátula */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-so-text truncate">{exp.caratula}</p>
              {exp.idCaso && (
                <div className="flex items-center gap-1 mt-0.5">
                  <LinkIcon size={9} className="text-so-red" />
                  <span className="text-[10px] text-so-red">Vinculado a caso interno</span>
                </div>
              )}
            </div>

            {/* Situación */}
            <div className="flex-shrink-0">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${situacionColor(exp.situacion)}`}>
                {exp.situacion || 'Sin estado'}
              </span>
            </div>

            {/* Última actuación */}
            <div className="flex-shrink-0 text-right hidden md:block">
              <p className="text-[10px] text-so-muted uppercase tracking-wider">Última act.</p>
              <p className="text-xs text-so-textMid">{exp.ultimaAct ?? '—'}</p>
            </div>

            {/* Link PJN */}
            <a
              href={`https://scw.pjn.gov.ar/scw/libroDigital.seam`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex-shrink-0 text-so-muted hover:text-so-text transition-colors"
              title="Ver en PJN"
            >
              <ExternalLink size={13} />
            </a>
          </button>

          {/* Panel expandido */}
          {expanded === exp.id && (
            <div className="border-t border-so-border">
              <PjnResumen idExpediente={exp.id} nro={exp.nro} caratula={exp.caratula} />
              <PjnActuacionesPanel idExpediente={exp.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
