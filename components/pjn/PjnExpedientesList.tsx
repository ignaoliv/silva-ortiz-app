'use client'

import { useState } from 'react'
import type { DBPjnExpediente } from '@/lib/queries'
import PjnActuacionesPanel from './PjnActuacionesPanel'
import PjnResumen from './PjnResumen'
import { Plus, Minus, ExternalLink, LinkIcon } from 'lucide-react'

interface Props {
  expedientes: DBPjnExpediente[]
}

const SITUACION_COLOR: Record<string, string> = {
  activo:    'text-emerald-400',
  archivado: 'text-so-muted',
  paralizado:'text-yellow-400',
}

function situacionColor(s: string) {
  const k = s.toLowerCase()
  for (const [key, cls] of Object.entries(SITUACION_COLOR)) {
    if (k.includes(key)) return cls
  }
  return 'text-so-muted'
}

export default function PjnExpedientesList({ expedientes }: Props) {
  const [expanded, setExpanded] = useState<number | null>(
    expedientes.length === 1 ? expedientes[0].id : null
  )

  return (
    <div className="border-t border-so-border">
      {expedientes.map(exp => {
        const isOpen = expanded === exp.id

        return (
          <div key={exp.id} className="border-b border-so-border">

            {/* ── Cabecera clicable ── */}
            <button
              onClick={() => setExpanded(isOpen ? null : exp.id)}
              className="w-full flex items-start gap-6 px-8 py-6 hover:bg-so-surface/30 transition-colors text-left group"
            >
              {/* Toggle icon */}
              <div className="flex-shrink-0 mt-1 w-5 h-5 flex items-center justify-center border border-so-border group-hover:border-so-ash transition-colors">
                {isOpen
                  ? <Minus size={11} className="text-so-ash" />
                  : <Plus  size={11} className="text-so-muted group-hover:text-so-ash transition-colors" />
                }
              </div>

              {/* Número + dependencia */}
              <div className="flex-shrink-0 w-44">
                <p className="font-mono text-xs font-semibold text-so-text tracking-wide">
                  {exp.nro}
                </p>
                <p className="text-[10px] text-so-muted mt-1 leading-snug">{exp.dependencia}</p>
              </div>

              {/* Carátula */}
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-semibold text-so-text leading-snug group-hover:text-white transition-colors">
                  {exp.caratula}
                </p>
                {exp.idCaso && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <LinkIcon size={9} className="text-so-ash" />
                    <span className="text-[10px] text-so-ash tracking-wide">Vinculado a caso interno</span>
                  </div>
                )}
              </div>

              {/* Situación */}
              <div className="flex-shrink-0 hidden md:flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${situacionColor(exp.situacion)}`}>
                  {exp.situacion || 'Sin estado'}
                </span>
                {exp.ultimaAct && (
                  <span className="text-[10px] text-so-muted tabular-nums">
                    Últ. {exp.ultimaAct}
                  </span>
                )}
              </div>

              {/* Link externo PJN */}
              <a
                href="https://scw.pjn.gov.ar/scw/libroDigital.seam"
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 mt-0.5 text-so-border hover:text-so-ash transition-colors"
                title="Ver en PJN"
              >
                <ExternalLink size={13} />
              </a>
            </button>

            {/* ── Panel expandido ── */}
            {isOpen && (
              <div className="border-t border-so-border/50">
                <PjnResumen idExpediente={exp.id} nro={exp.nro} caratula={exp.caratula} />
                <PjnActuacionesPanel idExpediente={exp.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
