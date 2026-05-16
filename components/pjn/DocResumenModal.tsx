'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Download, Eye } from 'lucide-react'
import ClaudeIcon from '@/components/ClaudeIcon'

interface Props {
  blobUrl:        string
  titulo:         string
  textoExtraido?: string | null
  resumenIa?:     string | null   // resumen pre-generado — si existe, se muestra directo
  onClose:        () => void
  onVerPdf:       () => void
}

export default function DocResumenModal({ blobUrl, titulo, textoExtraido, resumenIa, onClose, onVerPdf }: Props) {
  const [resumen,  setResumen]  = useState(resumenIa ?? '')
  const [loading,  setLoading]  = useState(!resumenIa)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    if (resumenIa) return  // ya tenemos resumen cacheado
    async function fetchResumen() {
      try {
        const res = await fetch('/api/pjn/resumir-doc', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ blobUrl, titulo, textoExtraido }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? `Error ${res.status}`)
        }

        if (!res.body) throw new Error('Sin respuesta')

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let txt = ''
        setLoading(false)
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          txt += decoder.decode(value, { stream: true })
          setResumen(txt)
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al resumir el documento')
        setLoading(false)
      }
    }
    fetchResumen()
  }, [blobUrl, titulo])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-so-card border border-so-border flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-so-border">
          <div className="flex items-center gap-2.5">
            {/* Badge Claude */}
            <div className="flex items-center gap-1.5 bg-[#D4A847]/10 border border-[#D4A847]/30 px-2 py-1 rounded">
              <ClaudeIcon size={13} className="text-[#D4A847]" />
              <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#D4A847]">Claude</span>
            </div>
            <span className="text-xs text-so-muted">·</span>
            <p className="text-xs font-medium text-so-text truncate max-w-[280px]">{titulo}</p>
          </div>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-5 flex-1">
          {loading && (
            <div className="flex items-center gap-2.5 text-so-muted">
              <Loader2 size={14} className="animate-spin text-[#D4A847]" />
              <span className="text-xs">Leyendo documento...</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          )}

          {!loading && !error && resumen && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-so-ash mb-3">
                Resumen del documento
              </p>
              <p className="text-sm text-so-text leading-relaxed">
                {resumen}
                {loading && (
                  <span className="inline-block w-1.5 h-[1em] bg-[#D4A847]/70 ml-0.5 animate-pulse align-middle" />
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer — acciones */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-so-border bg-so-surface/40">
          <p className="text-[9px] text-so-muted tracking-wide">
            Generado por Claude · Solo orientativo
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onVerPdf}
              className="flex items-center gap-1.5 text-[10px] text-so-textMid hover:text-so-text transition-colors font-medium"
            >
              <Eye size={12} />
              Ver PDF
            </button>
            <a
              href={blobUrl}
              download
              className="flex items-center gap-1.5 text-[10px] text-so-ash hover:text-so-ashLight transition-colors font-medium"
            >
              <Download size={12} />
              Descargar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
