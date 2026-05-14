'use client'

import { useEffect, useRef, useState } from 'react'
import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { fmtDateLarga } from '@/lib/utils'

export default function TabNotas({ casoId }: { casoId: number }) {
  const [contenido, setContenido] = useState('')
  const [fechaMod,  setFechaMod]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'ok' | 'error'>('idle')
  const [errMsg,    setErrMsg]    = useState('')
  const original = useRef('')

  useEffect(() => {
    fetch(`/api/casos/${casoId}/notas`)
      .then(r => r.json())
      .then(d => {
        setContenido(d.contenido ?? '')
        setFechaMod(d.fechaMod)
        original.current = d.contenido ?? ''
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [casoId])

  async function guardar() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch(`/api/casos/${casoId}/notas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      // Solo actualizamos el original si el guardado fue exitoso
      original.current = contenido
      setStatus('ok')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'No se pudo guardar')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const dirty = contenido !== original.current

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-so-muted py-8 justify-center">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-xs tracking-widest uppercase">Cargando...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-muted">
            Notas del estudio
          </p>
          {fechaMod && (
            <p className="text-[10px] text-so-muted mt-0.5">
              Última edición: {fmtDateLarga(fechaMod)}
            </p>
          )}
        </div>
        <button
          onClick={guardar}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-so-ash text-white hover:bg-so-ashLight"
        >
          {saving          ? <Loader2     size={11} className="animate-spin" />
           : status === 'ok'    ? <CheckCircle  size={11} />
           : status === 'error' ? <AlertCircle  size={11} />
           : <Save size={11} />}
          {status === 'ok' ? 'Guardado' : status === 'error' ? 'Error' : 'Guardar'}
        </button>
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-red-400">{errMsg}</p>
        </div>
      )}

      <textarea
        value={contenido}
        onChange={e => { setContenido(e.target.value); setStatus('idle') }}
        placeholder="Escribí notas internas del caso: observaciones, estrategia, recordatorios..."
        rows={12}
        className="w-full bg-so-surface border border-so-border text-sm text-so-text placeholder:text-so-muted/50 resize-none p-4 focus:outline-none focus:border-so-ash transition-colors leading-relaxed font-mono"
      />

      <p className="text-[10px] text-so-muted">
        Estas notas son internas del estudio y no son visibles por el cliente.
      </p>
    </div>
  )
}
