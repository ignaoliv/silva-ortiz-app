'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

type Tipo = 'error' | 'sugerencia' | 'consulta' | 'otro'

const TIPOS: { value: Tipo; label: string; emoji: string }[] = [
  { value: 'error',      label: 'Error / Bug',  emoji: '🐛' },
  { value: 'sugerencia', label: 'Sugerencia',   emoji: '💡' },
  { value: 'consulta',   label: 'Consulta',     emoji: '❓' },
  { value: 'otro',       label: 'Otro',         emoji: '📝' },
]

export default function FeedbackButton() {
  const [open,   setOpen]   = useState(false)
  const [tipo,   setTipo]   = useState<Tipo>('sugerencia')
  const [msg,    setMsg]    = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reset on open
  function handleOpen() {
    setStatus('idle')
    setErrMsg('')
    setMsg('')
    setTipo('sugerencia')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!msg.trim() || status === 'sending') return
    setStatus('sending')
    setErrMsg('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, mensaje: msg.trim(), pagina: pathname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrMsg(data.error ?? 'Error al enviar. Intentá de nuevo.')
        return
      }
      setStatus('ok')
      setTimeout(() => setOpen(false), 2400)
    } catch {
      setStatus('error')
      setErrMsg('No se pudo conectar. Revisá tu conexión.')
    }
  }

  const tipoActual = TIPOS.find(t => t.value === tipo)!

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">

      {/* Panel */}
      {open && (
        <div className="w-80 bg-so-card border border-so-border shadow-2xl overflow-hidden" style={{ borderRadius: 2 }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-so-border bg-so-surface/60">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-so-ash" />
              <p className="text-[12px] font-semibold text-so-text" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Enviar feedback
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-so-muted hover:text-so-text transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          {status === 'ok' ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
              <CheckCircle size={32} className="text-emerald-400" />
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-so-text">¡Gracias por tu feedback!</p>
                <p className="text-[11px] text-so-muted leading-relaxed">Tu mensaje fue enviado al equipo.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">

              {/* Tipo selector */}
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-so-muted mb-1.5">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIPOS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border transition-colors text-left',
                        tipo === t.value
                          ? 'border-so-ash bg-so-ash/15 text-so-text font-medium'
                          : 'border-so-border text-so-muted hover:border-so-muted hover:text-so-textMid bg-so-surface'
                      )}
                    >
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-so-muted mb-1.5">
                  Mensaje
                </label>
                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder={
                    tipo === 'error'      ? 'Describí qué pasó y cuándo...' :
                    tipo === 'sugerencia' ? 'Contanos tu idea...' :
                    tipo === 'consulta'   ? 'Escribí tu pregunta...' :
                    'Tu mensaje...'
                  }
                  rows={4}
                  maxLength={2000}
                  className="w-full input resize-none text-xs leading-relaxed"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
                <p className="text-right text-[10px] text-so-muted mt-1">{msg.length}/2000</p>
              </div>

              {/* Error */}
              {status === 'error' && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{errMsg}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!msg.trim() || status === 'sending'}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-so-ash hover:bg-so-ashLight text-white text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {status === 'sending' ? (
                  <>
                    <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Enviar feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 shadow-lg text-white text-[12px] font-semibold transition-all duration-200',
          open ? 'bg-so-muted hover:bg-so-ash' : 'bg-so-ash hover:bg-so-ashLight',
        )}
        style={{ borderRadius: 2, fontFamily: 'Inter, system-ui, sans-serif' }}
        aria-label="Enviar feedback"
      >
        <MessageSquare size={14} />
        Feedback
      </button>

    </div>
  )
}
