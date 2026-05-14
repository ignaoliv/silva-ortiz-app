'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface Props {
  idExpediente: number
  nro:          string
  caratula:     string
}

export default function PjnResumen({ idExpediente, nro, caratula }: Props) {
  const [resumen,   setResumen]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function generar() {
    setLoading(true)
    setError(null)
    setResumen('')

    const params = new URLSearchParams({
      id:       String(idExpediente),
      nro,
      caratula,
    })

    try {
      const res = await fetch(`/api/pjn/resumen?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      if (!res.body) throw new Error('Sin respuesta del servidor')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let texto = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        texto += decoder.decode(value, { stream: true })
        setResumen(texto)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al generar resumen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-4 border-t border-so-border bg-so-surface/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-so-red" />
          <span className="text-[11px] font-semibold text-so-text uppercase tracking-wider">
            Resumen IA
          </span>
        </div>
        <button
          onClick={generar}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-medium text-so-textMid hover:text-so-text border border-so-border hover:border-so-red/40 rounded-md px-2.5 py-1 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : resumen ? (
            <RefreshCw size={11} />
          ) : (
            <Sparkles size={11} />
          )}
          {resumen ? 'Regenerar' : 'Generar'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {!resumen && !loading && !error && (
        <p className="text-xs text-so-muted italic">
          Hacé clic en &quot;Generar&quot; para obtener un resumen del expediente.
        </p>
      )}

      {(resumen || loading) && (
        <p className="text-xs text-so-textMid leading-relaxed">
          {resumen}
          {loading && (
            <span className="inline-block w-1.5 h-3.5 bg-so-red/70 ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </p>
      )}
    </div>
  )
}
