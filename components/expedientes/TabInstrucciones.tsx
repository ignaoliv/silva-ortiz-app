'use client'

import { useEffect, useRef, useState } from 'react'
import { Save, Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { fmtDateLarga } from '@/lib/utils'

export default function TabInstrucciones({ casoId }: { casoId: number }) {
  const [contenido, setContenido] = useState('')
  const [fechaMod,  setFechaMod]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'ok' | 'error'>('idle')
  const [errMsg,    setErrMsg]    = useState('')
  const original = useRef('')

  useEffect(() => {
    fetch(`/api/casos/${casoId}/instrucciones`)
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
      const res = await fetch(`/api/casos/${casoId}/instrucciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
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
            Instrucciones del cliente
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
          {saving               ? <Loader2    size={11} className="animate-spin" />
           : status === 'ok'    ? <CheckCircle size={11} />
           : status === 'error' ? <AlertCircle size={11} />
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

      <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
        <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-amber-300 leading-relaxed">
          Registrá aquí las instrucciones y mandatos recibidos del cliente: montos autorizados,
          condiciones de acuerdo, limitaciones y cualquier directiva relevante para el caso.
        </p>
      </div>

      <textarea
        value={contenido}
        onChange={e => { setContenido(e.target.value); setStatus('idle') }}
        placeholder="Ej: El cliente autoriza transacción hasta $2.000.000 con pago en una sola cuota. No acepta acuerdos con cláusula de confidencialidad..."
        rows={12}
        className="w-full bg-so-surface border border-so-border text-sm text-so-text placeholder:text-so-muted/50 resize-none p-4 focus:outline-none focus:border-so-ash transition-colors leading-relaxed"
      />
    </div>
  )
}
