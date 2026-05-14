'use client'

import { useState } from 'react'
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react'

interface Props {
  idExpediente: number
  nro:          string
  caratula:     string
}

export default function PjnResumen({ idExpediente, nro, caratula }: Props) {
  const [resumen, setResumen] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function generar() {
    setLoading(true)
    setError(null)
    setResumen('')

    const params = new URLSearchParams({ id: String(idExpediente), nro, caratula })

    try {
      const res = await fetch(`/api/pjn/resumen?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      if (!res.body) throw new Error('Sin respuesta del servidor')

      const reader  = res.body.getReader()
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
    <div className="border-b border-so-border">
      {/* Sin resumen aún: bloque promocional completo */}
      {!resumen && !loading && !error && (
        <div className="grid lg:grid-cols-[1fr_auto] items-stretch">

          {/* Texto izquierda */}
          <div className="px-8 py-8 border-r border-so-border">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-ash mb-3">
              Análisis IA
            </p>
            <h3 className="font-heading text-xl font-semibold text-so-text leading-tight mb-2">
              Resumen ejecutivo del expediente
            </h3>
            <p className="text-xs text-so-muted leading-relaxed max-w-xl">
              Generamos un análisis del estado procesal basado en todas las actuaciones registradas.
            </p>
          </div>

          {/* Botón derecha — fill animation */}
          <button
            onClick={generar}
            className="group relative overflow-hidden flex items-center gap-4 px-10 py-8 text-xs font-bold tracking-[0.15em] uppercase text-so-ash border-l-4 border-so-ash bg-transparent hover:text-white transition-colors duration-300"
          >
            {/* fill de derecha a izquierda no, del borde izquierdo */}
            <span className="absolute inset-0 bg-so-ash scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]" />
            <span className="relative flex items-center gap-3 whitespace-nowrap">
              Generar análisis
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      )}

      {/* Cargando o con resumen */}
      {(resumen !== null || loading || error) && (
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-px h-5 bg-so-ash" />
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-ash">
                Análisis IA
              </p>
              {loading && <Loader2 size={11} className="animate-spin text-so-ash" />}
            </div>
            {!loading && (
              <button
                onClick={generar}
                className="group flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-so-muted hover:text-so-ash transition-colors font-medium"
              >
                <RefreshCw size={10} />
                Regenerar
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {resumen !== null && (
            <p className="text-sm text-so-textMid leading-relaxed max-w-3xl">
              {resumen}
              {loading && (
                <span className="inline-block w-1.5 h-[1em] bg-so-ash/70 ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
