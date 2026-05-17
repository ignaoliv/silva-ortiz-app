'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import ClaudeIcon from '@/components/ClaudeIcon'
import PjnActuacionesPanel from '@/components/pjn/PjnActuacionesPanel'
import type { DBPjnExpediente } from '@/lib/queries'

interface Props {
  casoId: number
}

export default function TabPjn({ casoId }: Props) {
  const [exp, setExp]     = useState<DBPjnExpediente | null>(null)
  const [loading, setLoad] = useState(true)

  useEffect(() => {
    fetch(`/api/casos/${casoId}/pjn`)
      .then(r => r.json())
      .then(d => { setExp(d); setLoad(false) })
      .catch(() => setLoad(false))
  }, [casoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-so-muted">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-[11px] tracking-widest uppercase">Cargando PJN</span>
      </div>
    )
  }

  if (!exp) {
    return (
      <div className="text-center py-10 space-y-2">
        <p className="text-xs text-so-muted">Este caso no está vinculado a un expediente del PJN.</p>
        <p className="text-[11px] text-so-subtle">
          Vinculá el expediente desde la sección PJN para ver las actuaciones acá.
        </p>
      </div>
    )
  }

  return (
    <div className="-mx-6 -mt-6">
      {/* Header del expediente PJN + resumen IA */}
      <div className="px-8 py-5 border-b border-so-border bg-so-surface/30">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-wider text-so-muted">{exp.nro}</span>
              <span className="text-[10px] text-so-subtle">·</span>
              <span className="text-[10px] text-so-textMid">{exp.dependencia}</span>
            </div>
            <p className="text-xs text-so-text leading-snug">{exp.caratula}</p>
          </div>
          <a
            href="/pjn"
            className="flex items-center gap-1 text-[10px] text-so-ash hover:text-so-ashLight transition-colors whitespace-nowrap"
          >
            <ExternalLink size={11} />
            Ver completo
          </a>
        </div>

        {/* Resumen IA del expediente */}
        {exp.resumenIa && (
          <div className="mt-4 bg-[#D4A847]/5 border border-[#D4A847]/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClaudeIcon size={12} className="text-[#D4A847]" />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#D4A847]">
                Resumen del expediente
              </span>
            </div>
            <p className="text-[11px] text-so-textMid leading-relaxed whitespace-pre-wrap">
              {exp.resumenIa}
            </p>
          </div>
        )}
      </div>

      {/* Listado de actuaciones (componente existente) */}
      <PjnActuacionesPanel idExpediente={exp.id} />
    </div>
  )
}
