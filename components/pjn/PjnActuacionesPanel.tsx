'use client'

import { useEffect, useState } from 'react'
import type { DBPjnActuacion } from '@/lib/queries'
import { FileText, Download, Loader2 } from 'lucide-react'

interface Props {
  idExpediente: number
}

// Mapeo por keyword del tipo completo (ej: "ESCRITO AGREGADO", "FIRMA DESPACHO", etc.)
function tipoColor(tipo: string) {
  const t = tipo.trim().toUpperCase()
  if (t.includes('ESCRITO') || t === 'E')          return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  if (t.includes('DESPACHO') || t.includes('FIRMA') || t === 'D') return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  if (t.includes('CEDULA') || t === 'C')           return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (t.includes('OFICIO') || t === 'O')           return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  if (t.includes('SENTENCIA') || t.includes('PUBLICACION') || t === 'P') return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
  if (t.includes('MOVIMIENTO'))                    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  return 'bg-so-surface text-so-muted border-so-border'
}

// Abreviatura para el badge (máx 2 letras)
function tipoLabel(tipo: string) {
  const t = tipo.trim().toUpperCase()
  if (t.includes('ESCRITO'))    return 'ES'
  if (t.includes('DESPACHO'))   return 'DE'
  if (t.includes('CEDULA'))     return 'CE'
  if (t.includes('OFICIO'))     return 'OF'
  if (t.includes('SENTENCIA') || t.includes('PUBLICACION')) return 'SE'
  if (t.includes('MOVIMIENTO')) return 'MV'
  if (t.includes('FIRMA'))      return 'FI'
  return t.charAt(0)
}

// YYYY-MM-DD → DD/MM/AAAA
function formatFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

// Parsear detalle: "TÍTULO [Presentado DD/MM/AAAA HH:MM] descripción..."
function parseDetalle(detalle: string) {
  const match = detalle.match(/^(.*?)\[Presentado\s+(\d{2}\/\d{2}\/\d{4}[^\]]*)\]\s*(.*)$/s)
  if (!match) return { titulo: detalle, fechaPresentacion: null, descripcion: null }
  return {
    titulo:           match[1].trim(),
    fechaPresentacion: match[2].trim(),
    descripcion:      match[3].trim() || null,
  }
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

  if (error) return <p className="text-xs text-red-400 px-5 py-4">{error}</p>

  if (actuaciones.length === 0) {
    return (
      <p className="text-xs text-so-muted px-5 py-6 text-center">
        Sin actuaciones registradas aún.
      </p>
    )
  }

  return (
    <div className="divide-y divide-so-border/50">
      {/* Header */}
      <div className="grid grid-cols-[70px_100px_1fr_70px] gap-4 px-5 py-2 bg-so-surface/30">
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Tipo</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Fecha</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted">Detalle</span>
        <span className="text-[10px] uppercase tracking-wider text-so-muted text-right">Doc</span>
      </div>

      {actuaciones.map(act => {
        const { titulo, fechaPresentacion, descripcion } = parseDetalle(act.detalle)

        return (
          <div key={act.id} className="grid grid-cols-[70px_100px_1fr_70px] gap-4 px-5 py-3.5 hover:bg-so-surface/30 transition-colors items-start">
            {/* Tipo */}
            <div className="pt-0.5">
              {act.tipo ? (
                <span
                  title={act.tipo}
                  className={`inline-flex items-center justify-center text-[9px] font-bold px-1.5 h-5 rounded border ${tipoColor(act.tipo)}`}
                >
                  {tipoLabel(act.tipo)}
                </span>
              ) : (
                <span className="text-[10px] text-so-muted">—</span>
              )}
            </div>

            {/* Fecha actuación */}
            <div className="pt-0.5">
              <span className="text-xs font-medium text-so-text tabular-nums">
                {formatFecha(act.fecha)}
              </span>
              {act.fojas && (
                <p className="text-[10px] text-so-muted mt-0.5">fs. {act.fojas}</p>
              )}
            </div>

            {/* Detalle estructurado */}
            <div className="space-y-1 min-w-0">
              {/* Título */}
              {titulo && (
                <p className="text-xs font-semibold text-so-text leading-snug">{titulo}</p>
              )}
              {/* Fecha de presentación */}
              {fechaPresentacion && (
                <p className="text-[10px] text-so-muted">
                  Presentado: <span className="text-so-textMid">{fechaPresentacion}</span>
                </p>
              )}
              {/* Descripción */}
              {descripcion && (
                <p className="text-[11px] text-so-textMid leading-relaxed">{descripcion}</p>
              )}
              {/* Si no había patrón, mostrar todo */}
              {!fechaPresentacion && !titulo && (
                <p className="text-xs text-so-text leading-relaxed">{act.detalle}</p>
              )}
            </div>

            {/* Documento */}
            <div className="flex justify-end pt-0.5">
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
        )
      })}
    </div>
  )
}
