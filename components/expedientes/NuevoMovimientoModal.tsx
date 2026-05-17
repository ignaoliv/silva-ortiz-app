'use client'
import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPOS = [
  'Escrito presentado',
  'Resolución',
  'Notificación',
  'Audiencia',
  'Vista',
  'Cédula',
  'Oficio',
  'Otro',
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  casoId: number
  onClose: () => void
  onCreated: () => void
}

export default function NuevoMovimientoModal({ casoId, onClose, onCreated }: Props) {
  const [tipo,         setTipo]         = useState('Otro')
  const [titulo,       setTitulo]       = useState('')
  const [fecha,        setFecha]        = useState(todayISO())
  const [descripcion,  setDescripcion]  = useState('')
  const [urlDocumento, setUrlDocumento] = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!titulo.trim())      { setError('El título es obligatorio.'); return }
    if (!fecha)              { setError('La fecha es obligatoria.'); return }
    if (!descripcion.trim()) { setError('La descripción es obligatoria.'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/casos/${casoId}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          titulo:       titulo.trim().slice(0, 250),
          fecha,
          descripcion:  descripcion.trim(),
          urlDocumento: urlDocumento.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear el movimiento.'); return }
      onCreated()
      onClose()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-so-card border border-so-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-so-border">
          <div>
            <h2 className="text-sm font-medium text-so-text">Nuevo movimiento</h2>
            <p className="text-xs text-so-subtle mt-1">Registrá una nueva actuación del expediente.</p>
          </div>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Fecha *</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={250}
              required
              className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-red/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Descripción *</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              rows={4}
              className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-red/50 transition-colors resize-y"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">URL documento</label>
            <input
              type="url"
              value={urlDocumento}
              onChange={e => setUrlDocumento(e.target.value)}
              maxLength={1000}
              placeholder="https://..."
              className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-red/50 transition-colors"
            />
          </div>

          {error && (
            <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-so-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text transition-colors rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded transition-all',
              saving
                ? 'bg-so-surface text-so-muted border border-so-border cursor-not-allowed'
                : 'bg-so-red hover:opacity-80 text-white'
            )}
          >
            <Plus size={13} />
            {saving ? 'Guardando…' : 'Crear movimiento'}
          </button>
        </div>
      </div>
    </div>
  )
}
