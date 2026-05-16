'use client'
import { useState, useEffect } from 'react'
import { X, FileDown, AlertCircle, Loader2 } from 'lucide-react'

interface Plantilla {
  id: number
  nombre: string
  categoria: string | null
}

interface Props {
  casoId: number
  caratula?: string
  onClose: () => void
}

export default function GenerarDocumentoModal({ casoId, caratula, onClose }: Props) {
  const [plantillas,   setPlantillas]   = useState<Plantilla[]>([])
  const [loadingList,  setLoadingList]  = useState(true)
  const [selectedId,   setSelectedId]   = useState<string>('')
  const [generating,   setGenerating]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plantillas')
      .then(r => r.json())
      .then((data: Plantilla[]) => setPlantillas(data))
      .catch(() => setError('No se pudieron cargar las plantillas.'))
      .finally(() => setLoadingList(false))
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleGenerar() {
    if (!selectedId) { setError('Seleccioná una plantilla.'); return }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/plantillas/${selectedId}/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casoId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al generar el documento.')
        return
      }
      // Download blob
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch ? filenameMatch[1] : 'documento.docx'

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-so-card border border-so-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-so-border">
          <div>
            <h2 className="text-sm font-semibold text-so-text">Generar documento</h2>
            {caratula && (
              <p className="text-xs text-so-muted mt-0.5 truncate max-w-[300px]">{caratula}</p>
            )}
          </div>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {loadingList ? (
            <div className="flex items-center justify-center py-6 gap-2 text-so-muted text-sm">
              <Loader2 size={16} className="animate-spin" />
              Cargando plantillas…
            </div>
          ) : plantillas.length === 0 ? (
            <p className="text-sm text-so-muted text-center py-4">
              No hay plantillas creadas.{' '}
              <a href="/plantillas/nueva" className="text-so-red hover:underline">
                Creá una
              </a>
              .
            </p>
          ) : (
            <div>
              <label className="block text-xs font-medium text-so-textMid mb-1.5">
                Plantilla *
              </label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                <option value="">— Seleccioná una plantilla —</option>
                {plantillas.map(p => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre}{p.categoria ? ` (${p.categoria})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded px-3 py-2.5 text-xs text-red-400">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-so-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={generating || loadingList || plantillas.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-so-red hover:opacity-80 text-white rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <FileDown size={13} />
                Generar .docx
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
