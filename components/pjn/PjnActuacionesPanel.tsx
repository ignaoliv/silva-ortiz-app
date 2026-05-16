'use client'

import { useEffect, useState } from 'react'
import type { DBPjnActuacion } from '@/lib/queries'
import { Download, Loader2, Eye, X, FileText } from 'lucide-react'
import ClaudeIcon from '@/components/ClaudeIcon'
import DocResumenModal from '@/components/pjn/DocResumenModal'

interface Props {
  idExpediente: number
}

function tipoColor(tipo: string) {
  const t = tipo.trim().toUpperCase()
  if (t.includes('ESCRITO') || t === 'E')                                return 'text-blue-400'
  if (t.includes('DESPACHO') || t.includes('FIRMA') || t === 'D')       return 'text-so-ash'
  if (t.includes('CEDULA') || t === 'C')                                 return 'text-emerald-400'
  if (t.includes('OFICIO') || t === 'O')                                 return 'text-orange-400'
  if (t.includes('SENTENCIA') || t.includes('PUBLICACION') || t === 'P') return 'text-pink-400'
  if (t.includes('MOVIMIENTO'))                                           return 'text-so-muted'
  return 'text-so-muted'
}

function tipoLabel(tipo: string) {
  const t = tipo.trim().toUpperCase()
  if (t.includes('ESCRITO'))                                 return 'Escrito'
  if (t.includes('FIRMA DESPACHO') || t.includes('DESPACHO')) return 'Despacho'
  if (t.includes('CEDULA'))                                  return 'Cédula'
  if (t.includes('OFICIO'))                                  return 'Oficio'
  if (t.includes('SENTENCIA') || t.includes('PUBLICACION'))  return 'Sentencia'
  if (t.includes('MOVIMIENTO'))                              return 'Movimiento'
  if (t.includes('FIRMA'))                                   return 'Firma'
  if (t.length <= 2)                                         return tipo.trim()
  return tipo.trim()
}

function formatFecha(iso: string) {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

function parseDetalle(detalle: string) {
  const match = detalle.match(/^([\s\S]*?)\[Presentado\s+(\d{2}\/\d{2}\/\d{4}[^\]]*)\]\s*([\s\S]*)$/)
  if (!match) return { titulo: detalle, fechaPresentacion: null, descripcion: null }
  return {
    titulo:            match[1].trim(),
    fechaPresentacion: match[2].trim(),
    descripcion:       match[3].trim() || null,
  }
}

// ── Visor PDF fullscreen ──────────────────────────────────────────
function PdfModal({ url, titulo, onClose }: { url: string; titulo: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Barra */}
      <div className="flex items-center justify-between px-6 py-3 bg-so-surface border-b border-so-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-px h-5 bg-so-ash" />
          <p className="text-xs font-heading font-semibold text-so-text tracking-wide truncate max-w-[55vw]">
            {titulo}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={url}
            download
            className="group flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-so-ash hover:text-white transition-colors"
          >
            <Download size={12} />
            Descargar
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-so-muted hover:text-so-text transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <iframe src={url} className="flex-1 w-full bg-white" title={titulo} />
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────
export default function PjnActuacionesPanel({ idExpediente }: Props) {
  const [actuaciones, setActuaciones] = useState<DBPjnActuacion[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [viendoPdf, setViendoPdf]     = useState<{ url: string; titulo: string } | null>(null)
  const [resumiendo, setResumiendo]   = useState<{ url: string; titulo: string; textoExtraido?: string | null; resumenIa?: string | null } | null>(null)

  useEffect(() => {
    fetch(`/api/pjn/actuaciones?id=${idExpediente}`)
      .then(r => r.json())
      .then(d => { setActuaciones(d); setLoading(false) })
      .catch(() => { setError('Error al cargar actuaciones'); setLoading(false) })
  }, [idExpediente])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-so-muted">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-[11px] tracking-widest uppercase">Cargando actuaciones</span>
      </div>
    )
  }

  if (error) return <p className="text-xs text-red-400 px-8 py-5">{error}</p>

  if (actuaciones.length === 0) {
    return (
      <p className="text-xs text-so-muted px-8 py-8 text-center tracking-wide">
        Sin actuaciones registradas aún.
      </p>
    )
  }

  return (
    <>
      {viendoPdf && (
        <PdfModal
          url={viendoPdf.url}
          titulo={viendoPdf.titulo}
          onClose={() => setViendoPdf(null)}
        />
      )}

      {resumiendo && (
        <DocResumenModal
          blobUrl={resumiendo.url}
          titulo={resumiendo.titulo}
          textoExtraido={resumiendo.textoExtraido}
          resumenIa={resumiendo.resumenIa}
          onClose={() => setResumiendo(null)}
          onVerPdf={() => {
            setViendoPdf({ url: resumiendo.url, titulo: resumiendo.titulo })
            setResumiendo(null)
          }}
        />
      )}

      {/* Header columnas */}
      <div className="grid grid-cols-[120px_90px_1fr_88px] gap-6 px-8 py-3 border-b border-so-border/50">
        {['Tipo', 'Fecha', 'Actuación', 'Doc'].map((h, i) => (
          <span key={h} className={`text-[9px] font-bold tracking-[0.18em] uppercase text-so-muted ${i === 3 ? 'text-right' : ''}`}>
            {h}
          </span>
        ))}
      </div>

      <div>
        {actuaciones.map((act, idx) => {
          const { titulo, fechaPresentacion, descripcion } = parseDetalle(act.detalle)
          const tituloDoc = titulo || act.detalle

          return (
            <div
              key={act.id}
              className="grid grid-cols-[120px_90px_1fr_88px] gap-6 px-8 py-4 border-b border-so-border/30 hover:bg-so-surface/40 transition-colors items-start group"
            >
              {/* Tipo */}
              <div className="pt-px">
                <span className={`text-[10px] font-bold tracking-wide uppercase ${tipoColor(act.tipo)}`}>
                  {tipoLabel(act.tipo || '—')}
                </span>
              </div>

              {/* Fecha */}
              <div className="pt-px">
                <span className="text-xs text-so-textMid tabular-nums font-mono">
                  {formatFecha(act.fecha)}
                </span>
                {act.fojas && (
                  <p className="text-[10px] text-so-muted mt-0.5">fs. {act.fojas}</p>
                )}
              </div>

              {/* Detalle */}
              <div className="space-y-0.5 min-w-0">
                {titulo && (
                  <p className="text-xs font-semibold text-so-text leading-snug">{titulo}</p>
                )}
                {fechaPresentacion && (
                  <p className="text-[10px] text-so-muted">
                    Presentado <span className="text-so-textMid">{fechaPresentacion}</span>
                  </p>
                )}
                {descripcion && (
                  <p className="text-[11px] text-so-textMid leading-relaxed">{descripcion}</p>
                )}
                {!titulo && !fechaPresentacion && (
                  <p className="text-xs text-so-text leading-snug">{act.detalle}</p>
                )}
              </div>

              {/* Doc */}
              <div className="flex items-center justify-end gap-2 pt-px">
                {act.urlBlob ? (
                  <>
                    {/* Claude: resumir este PDF */}
                    <button
                      onClick={() => setResumiendo({ url: act.urlBlob!, titulo: tituloDoc, textoExtraido: act.textoExtraido, resumenIa: act.resumenIa })}
                      className="text-[#D4A847]/50 hover:text-[#D4A847] transition-colors"
                      title="Resumir con Claude IA"
                    >
                      <ClaudeIcon size={13} />
                    </button>
                    <button
                      onClick={() => setViendoPdf({ url: act.urlBlob!, titulo: tituloDoc })}
                      className="text-so-muted hover:text-so-ash transition-colors"
                      title="Ver PDF"
                    >
                      <Eye size={13} />
                    </button>
                    <a
                      href={act.urlBlob}
                      download
                      className="text-so-muted hover:text-so-ash transition-colors"
                      title="Descargar PDF"
                    >
                      <Download size={13} />
                    </a>
                  </>
                ) : (
                  <FileText size={13} className="text-so-border" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
