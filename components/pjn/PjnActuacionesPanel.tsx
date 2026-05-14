'use client'

import { useEffect, useState } from 'react'
import type { DBPjnActuacion } from '@/lib/queries'
import { FileText, Download, Loader2 } from 'lucide-react'

interface Props {
  idExpediente: number
}

const TIPO_COLOR: Record<string, string> = {
  E: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  D: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  C: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  O: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  P: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

function tipoColor(tipo: string) {
  const k = tipo.trim().charAt(0).toUpperCase()
  return TIPO_COLOR[k] ?? 'bg-so-surface text-so-muted border-so-border'
}

export default function PjnActuacionesPanel({ idExpediente }: Props) {
  const [actuaciones, setActuaciones] = useState<DBPjnActuacion[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/pjn/actuaciones?id=${idExpediente}`)
      .then(r => r.json())
      .then(d => { setActuaciones(d); setLoading(false) })
      .catch(() => { setError('Error al cargar actuaciones'); setLoading(false) })
  }, [idExpediente])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-so-muted">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">Cargando actuaciones...</span>
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-red-400 px-5 py-4">{error}</p>
  }

  if (actuaciones.length === 0) {
    return (
      <p className="text-xs text-so-muted px-5 py-6 text-center">
        Sin actuaciones registradas aún.
      </p>
    )
  }

  return (
    <div className="divide-y divide-so-border/50">
      {/* Header de columnas */}
      <div className="grid grid-cols-[80px_90px_1fr_80px] gap-4 px-5 py-2 bg-so-surface/30">
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Tipo</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Fecha</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Detalle</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted text-right">Doc</span>
      </div>

      {actuaciones.map(act => (
        <div key={act.id} className="grid grid-cols-[80px_90px_1fr_80px] gap-4 px-5 py-3 hover:bg-so-surface/30 transition-colors items-start">
          {/* Tipo */}
          <div>
            {act.tipo ? (
              <span className={`inline-flex items-center justify-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tipoColor(act.tipo)}`}>
                {act.tipo.substring(0, 15)}
              </span>
            ) : (
              <span className="text-[10px] text-so-muted">—</span>
            )}
          </div>

          {/* Fecha */}
          <div>
            <span className="text-xs text-so-textMid font-mono">{act.fecha}</span>
            {act.fojas && (
              <p className="text-[10px] text-so-muted mt-0.5">fs. {act.fojas}</p>
            )}
          </div>

          {/* Detalle */}
          <p className="text-xs text-so-text leading-relaxed">{act.detalle}</p>

          {/* Documento */}
          <div className="flex justify-end">
            {act.urlBlob ? (
              <a
                href={act.urlBlob}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-so-red hover:text-so-redLight transition-colors font-medium"
                title="Descargar PDF"
              >
                <Download size={12} />
                PDF
              </a>
            ) : (
              <FileText size={12} className="text-so-border" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
