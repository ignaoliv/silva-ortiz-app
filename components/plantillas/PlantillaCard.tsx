'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import type { DBPlantilla } from '@/lib/queries'

const CATEGORIA_COLORS: Record<string, string> = {
  'Escritos':           'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Cartas Documento':   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Oficios':            'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Demandas':           'bg-so-red/10 text-so-red border-so-red/20',
  'Recursos':           'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Otro':               'bg-so-surface text-so-muted border-so-border',
}

function fmtFecha(d: Date): string {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PlantillaCard({ plantilla }: { plantilla: DBPlantilla }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminár la plantilla "${plantilla.nombre}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/plantillas/${plantilla.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'Error al eliminar.')
      }
    } finally {
      setDeleting(false)
    }
  }

  const categoriaColor = plantilla.categoria
    ? (CATEGORIA_COLORS[plantilla.categoria] ?? 'bg-so-surface text-so-muted border-so-border')
    : 'bg-so-surface text-so-muted border-so-border'

  return (
    <div className="card p-5 flex flex-col gap-3 hover:border-so-red/30 transition-colors">
      {/* Icon + nombre */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-so-red/10 flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-so-red" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-so-text truncate">{plantilla.nombre}</p>
          {plantilla.categoria && (
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoriaColor}`}>
              {plantilla.categoria}
            </span>
          )}
        </div>
      </div>

      {/* Fecha */}
      <p className="text-[11px] text-so-muted">
        Actualizado el {fmtFecha(plantilla.actualizadoEn)}
      </p>

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1 border-t border-so-border">
        <button
          onClick={() => router.push(`/plantillas/${plantilla.id}/editar`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-so-textMid hover:text-so-text hover:bg-so-surface transition-colors rounded"
        >
          <Pencil size={12} />
          Editar
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors rounded disabled:opacity-50"
        >
          <Trash2 size={12} />
          {deleting ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>
    </div>
  )
}
