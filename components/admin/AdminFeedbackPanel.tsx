'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, ExternalLink, MessageSquare, Bug, Lightbulb, HelpCircle, FileText, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DBFeedback } from '@/lib/queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  error:      { label: 'Error',      icon: Bug,          color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30'     },
  sugerencia: { label: 'Sugerencia', icon: Lightbulb,    color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  consulta:   { label: 'Consulta',   icon: HelpCircle,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30'   },
  otro:       { label: 'Otro',       icon: FileText,      color: 'text-so-muted',   bg: 'bg-so-surface border-so-border'      },
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Row ───────────────────────────────────────────────────────────────────────

function FeedbackRow({ item, onToggleLeido, onDelete }: {
  item: DBFeedback
  onToggleLeido: (id: number, leido: boolean) => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = TIPO_META[item.tipo] ?? TIPO_META.otro
  const Icon = meta.icon

  return (
    <div
      className={cn(
        'border-b border-so-border/60 transition-colors',
        item.leido ? 'bg-transparent' : 'bg-so-ash/5'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-so-surface/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Unread dot */}
        <div className="flex-shrink-0 mt-1.5">
          {!item.leido
            ? <div className="w-2 h-2 rounded-full bg-so-ash" />
            : <div className="w-2 h-2 rounded-full bg-transparent" />
          }
        </div>

        {/* Tipo badge */}
        <span className={cn(
          'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold border rounded-full mt-0.5',
          meta.color, meta.bg
        )}>
          <Icon size={10} />
          {meta.label}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[13px] leading-snug truncate',
            item.leido ? 'text-so-textMid' : 'text-so-text font-medium'
          )}>
            {item.mensaje}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-so-muted">{item.nombreUsuario ?? item.emailUsuario}</span>
            {item.pagina && (
              <span className="text-[10px] text-so-muted font-mono bg-so-surface px-1.5 py-0.5 border border-so-border">
                {item.pagina}
              </span>
            )}
            <span className="text-[10px] text-so-subtle">{fmtDateTime(item.fechaCreacion)}</span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onToggleLeido(item.id, !item.leido)}
            title={item.leido ? 'Marcar no leído' : 'Marcar leído'}
            className={cn(
              'p-1.5 rounded transition-colors',
              item.leido
                ? 'text-so-border hover:text-so-muted hover:bg-so-surface'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Eliminar"
            className="p-1.5 rounded text-so-border hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pl-10 space-y-3 border-t border-so-border/40 pt-3 bg-so-surface/30">
          <p className="text-sm text-so-text leading-relaxed whitespace-pre-wrap">{item.mensaje}</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
            <div><span className="text-so-muted">Usuario: </span><span className="text-so-textMid">{item.emailUsuario}</span></div>
            <div><span className="text-so-muted">Fecha: </span><span className="text-so-textMid">{fmtDateTime(item.fechaCreacion)}</span></div>
            {item.pagina && (
              <div className="col-span-2">
                <span className="text-so-muted">Página: </span>
                <a href={item.pagina} target="_blank" rel="noreferrer"
                   className="text-so-ash hover:text-so-ashLight font-mono inline-flex items-center gap-1 transition-colors">
                  {item.pagina} <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onToggleLeido(item.id, !item.leido)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-colors',
                item.leido
                  ? 'border-so-border text-so-muted hover:text-so-text hover:border-so-muted bg-so-surface'
                  : 'border-emerald-600/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              )}
            >
              <Check size={11} />
              {item.leido ? 'Marcar no leído' : 'Marcar como leído'}
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-red-600/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={11} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FilterTipo = 'todos' | 'error' | 'sugerencia' | 'consulta' | 'otro'
type FilterLeido = 'todos' | 'no_leidos' | 'leidos'

export default function AdminFeedbackPanel({ feedback: initial }: { feedback: DBFeedback[] }) {
  const [items, setItems] = useState<DBFeedback[]>(initial)
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos')
  const [filterLeido, setFilterLeido] = useState<FilterLeido>('todos')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const noLeidos = items.filter(i => !i.leido).length

  const visible = items.filter(i => {
    if (filterTipo !== 'todos' && i.tipo !== filterTipo) return false
    if (filterLeido === 'no_leidos' && i.leido) return false
    if (filterLeido === 'leidos'    && !i.leido) return false
    return true
  })

  async function handleToggleLeido(id: number, leido: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, leido } : i))
    const res = await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, leido }),
    })
    if (!res.ok) {
      // Revert on error
      setItems(prev => prev.map(i => i.id === id ? { ...i, leido: !leido } : i))
    }
  }

  async function handleDelete(id: number) {
    const prev = items
    setItems(items.filter(i => i.id !== id))
    const res = await fetch('/api/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) setItems(prev)
  }

  async function handleMarcarTodosLeidos() {
    const noLeidosIds = items.filter(i => !i.leido).map(i => i.id)
    setItems(prev => prev.map(i => ({ ...i, leido: true })))
    await Promise.all(noLeidosIds.map(id =>
      fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, leido: true }),
      })
    ))
  }

  function handleRefresh() {
    startTransition(() => router.refresh())
  }

  const selectCls = 'bg-so-surface border border-so-border text-so-textMid text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-so-muted cursor-pointer'

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-so-border bg-so-surface/40">
        <div className="flex items-center gap-2 text-[11px] text-so-muted">
          <MessageSquare size={13} className="text-so-ash" />
          <span>
            <span className="font-semibold text-so-text">{items.length}</span> mensajes
            {noLeidos > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-so-ash/20 border border-so-ash/30 rounded-full text-so-ash font-semibold">
                {noLeidos} no leídos
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as FilterTipo)} className={selectCls}>
            <option value="todos">Todos los tipos</option>
            <option value="error">🐛 Error</option>
            <option value="sugerencia">💡 Sugerencia</option>
            <option value="consulta">❓ Consulta</option>
            <option value="otro">📝 Otro</option>
          </select>
          <select value={filterLeido} onChange={e => setFilterLeido(e.target.value as FilterLeido)} className={selectCls}>
            <option value="todos">Todos</option>
            <option value="no_leidos">No leídos</option>
            <option value="leidos">Leídos</option>
          </select>

          {noLeidos > 0 && (
            <button onClick={handleMarcarTodosLeidos} className="btn text-[11px]">
              <Check size={11} /> Marcar todos leídos
            </button>
          )}
          <button onClick={handleRefresh} disabled={pending} className="btn text-[11px]">
            {pending ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-so-border/0">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <MessageSquare size={32} className="text-so-border" />
            <p className="text-sm text-so-muted">
              {items.length === 0
                ? 'Todavía no hay mensajes de feedback.'
                : 'No hay mensajes con los filtros seleccionados.'}
            </p>
          </div>
        )}
        {visible.map(item => (
          <FeedbackRow
            key={item.id}
            item={item}
            onToggleLeido={handleToggleLeido}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
