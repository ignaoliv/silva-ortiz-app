'use client'
import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  ChevronUp, ChevronDown, Search, Download, ChevronLeft, ChevronRight,
  X, SlidersHorizontal, MoreHorizontal, FileText, Eye
} from 'lucide-react'
import { fmtDate, fmtMoney, diffDays, cn } from '@/lib/utils'
import type { DBCaso, DBCliente, DBUsuario } from '@/lib/queries'
import { BadgeEstadoCaso } from '@/components/ui/Badge'
import ExpedienteModal from './ExpedienteModal'

const PAGE_SIZE = 10
type SortCol = 'nro' | 'caratula' | 'cliente' | 'estado' | 'responsable' | 'vencimiento' | 'ultimaActuacion'
type SortDir = 1 | -1

// ── Helpers ───────────────────────────────────────────────────────────────────

function VencimientoCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-so-muted">—</span>
  const diff = diffDays(iso)
  const cls =
    diff < 0    ? 'text-red-400 font-medium' :
    diff <= 3   ? 'text-red-400' :
    diff <= 7   ? 'text-amber-400' :
    'text-so-textMid'
  return <span className={cls}>{fmtDate(iso)}</span>
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronUp size={11} className="text-so-border" />
  return dir === 1
    ? <ChevronUp   size={11} className="text-so-red" />
    : <ChevronDown size={11} className="text-so-red" />
}

function exportCSV(rows: DBCaso[]) {
  const head = 'N°,Carátula,Cliente,Estado,Responsable,Fuero,Vencimiento,Monto'
  const body = rows.map(c => [
    c.nro, `"${c.caratula}"`, `"${c.clienteNombre}"`, c.estado,
    c.responsableNombre, c.fuero, c.vencimiento ?? '—', c.monto,
  ].join(',')).join('\n')
  const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'expedientes.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── 3-dot row menu ────────────────────────────────────────────────────────────

function RowMenu({ caso, onOpen }: { caso: DBCaso; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded hover:bg-so-surface text-so-muted hover:text-so-text transition-colors"
        aria-label="Opciones"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-so-card border border-so-border shadow-xl py-1">
          <button
            onClick={() => { onOpen(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-so-textMid hover:bg-so-surface hover:text-so-text transition-colors text-left"
          >
            <Eye size={12} /> Ver detalles
          </button>
          <button
            onClick={() => { exportCSV([caso]); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-so-textMid hover:bg-so-surface hover:text-so-text transition-colors text-left"
          >
            <FileText size={12} /> Exportar fila
          </button>
        </div>
      )}
    </div>
  )
}

// ── Acciones dropdown ─────────────────────────────────────────────────────────

function AccionesMenu({ onExport }: { onExport: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn flex items-center gap-1.5"
      >
        <SlidersHorizontal size={12} />
        Acciones
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-so-card border border-so-border shadow-xl py-1">
          <button
            onClick={() => { onExport(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-so-textMid hover:bg-so-surface hover:text-so-text transition-colors text-left"
          >
            <Download size={12} /> Exportar CSV
          </button>
        </div>
      )}
    </div>
  )
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function Chip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-so-ash/15 border border-so-ash/30 text-[11px] text-so-text rounded-full">
      <span className="text-so-muted">{label}:</span> {value}
      <button onClick={onClear} className="ml-0.5 text-so-muted hover:text-so-text transition-colors">
        <X size={10} />
      </button>
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  casos: DBCaso[]
  clientes: DBCliente[]
  usuarios: DBUsuario[]
  negociacionActive?: boolean
  onClearNegociacion?: () => void
  initialClienteId?: number
}

export default function ExpedientesTable({ casos, clientes, usuarios, negociacionActive = false, onClearNegociacion, initialClienteId }: Props) {
  const fueros       = useMemo(() => Array.from(new Set(casos.map(c => c.fuero))).sort(), [casos])
  const responsables = useMemo(() => Array.from(new Set(casos.map(c => c.responsableNombre))).sort(), [casos])
  const estados      = useMemo(() => Array.from(new Set(casos.map(c => c.estado))).sort(), [casos])
  const clientesConCasos = useMemo(() =>
    Array.from(new Map(casos.map(c => [c.clienteId, c.clienteNombre])).entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [casos])

  const [query,       setQuery]      = useState('')
  const [estado,      setEstado]     = useState('')
  const [fuero,       setFuero]      = useState('')
  const [responsable, setResponsable] = useState('')
  const [clienteId,   setClienteId]  = useState<number | ''>(initialClienteId ?? '')
  const [sortCol,     setSortCol]    = useState<SortCol>('ultimaActuacion')
  const [sortDir,     setSortDir]    = useState<SortDir>(-1)
  const [page,        setPage]       = useState(1)
  const [selected,    setSelected]   = useState<DBCaso | null>(null)

  // Sync negociacionActive → resetear página
  useEffect(() => { setPage(1) }, [negociacionActive])

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(1) }
    setPage(1)
  }

  function clearAll() {
    setQuery(''); setEstado(''); setFuero(''); setResponsable(''); setClienteId(''); setPage(1)
  }

  const hasFilters = !!query || !!estado || !!fuero || !!responsable || clienteId !== ''

  const filtered = useMemo(() => {
    let rows = casos
    if (negociacionActive) rows = rows.filter(c => /negoci/i.test(c.estado))
    if (query)       rows = rows.filter(c =>
      c.caratula.toLowerCase().includes(query.toLowerCase()) ||
      c.nro.toLowerCase().includes(query.toLowerCase())
    )
    if (!negociacionActive && estado) rows = rows.filter(c => c.estado === estado)
    if (fuero)        rows = rows.filter(c => c.fuero  === fuero)
    if (responsable)  rows = rows.filter(c => c.responsableNombre === responsable)
    if (clienteId !== '') rows = rows.filter(c => c.clienteId === clienteId)
    return [...rows].sort((a, b) => {
      let va = '', vb = ''
      if (sortCol === 'nro')             { va = a.nro;                        vb = b.nro }
      if (sortCol === 'caratula')        { va = a.caratula;                   vb = b.caratula }
      if (sortCol === 'cliente')         { va = a.clienteNombre;              vb = b.clienteNombre }
      if (sortCol === 'estado')          { va = a.estado;                     vb = b.estado }
      if (sortCol === 'responsable')     { va = a.responsableNombre;          vb = b.responsableNombre }
      if (sortCol === 'vencimiento')     { va = a.vencimiento ?? 'z';         vb = b.vencimiento ?? 'z' }
      if (sortCol === 'ultimaActuacion') { va = a.ultimaActuacion ?? '0';     vb = b.ultimaActuacion ?? '0' }
      return va < vb ? -sortDir : va > vb ? sortDir : 0
    })
  }, [casos, query, estado, fuero, responsable, clienteId, sortCol, sortDir, negociacionActive])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectCls = 'bg-so-surface border border-so-border text-so-textMid text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-so-muted cursor-pointer'

  function ThSort({ col, label, cls = '' }: { col: SortCol; label: string; cls?: string }) {
    return (
      <th
        className={cn('px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-so-muted cursor-pointer select-none whitespace-nowrap', cls)}
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}<SortIcon col={col} active={sortCol} dir={sortDir} />
        </span>
      </th>
    )
  }

  // Color maps
  const clienteColors = useMemo(() => {
    const colors = ['#82181a','#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#0284c7']
    return Object.fromEntries(clientes.map((c, i) => [c.id, colors[i % colors.length]]))
  }, [clientes])

  const usuarioInitials = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(w => w[0]).join('')

  const usuarioColor = useMemo(() => {
    const colors = ['#82181a','#2563eb','#059669','#d97706','#7c3aed','#0891b2']
    return Object.fromEntries(usuarios.map((u, i) => [u.id, colors[i % colors.length]]))
  }, [usuarios])

  return (
    <>
      <div className="card flex flex-col">

        {/* ── Search bar ── */}
        <div className="px-4 pt-4 pb-3 border-b border-so-border">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-so-muted" />
              <input
                type="text"
                placeholder="Buscar por carátula, número de expediente..."
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1) }}
                className="input w-full pl-9 py-2.5 text-sm"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setPage(1) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-so-muted hover:text-so-text transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <AccionesMenu onExport={() => exportCSV(filtered)} />
            {negociacionActive && (
              <button
                onClick={onClearNegociacion}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-so-text border border-so-border bg-so-surface hover:bg-so-card hover:border-so-muted rounded transition-colors whitespace-nowrap"
              >
                <X size={12} />
                Mostrar todos
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <select
              value={clienteId}
              onChange={e => { setClienteId(e.target.value === '' ? '' : parseInt(e.target.value)); setPage(1) }}
              className={selectCls}
            >
              <option value="">Cliente</option>
              {clientesConCasos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }} className={selectCls}>
              <option value="">Estado procesal</option>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={fuero} onChange={e => { setFuero(e.target.value); setPage(1) }} className={selectCls}>
              <option value="">Fuero</option>
              {fueros.map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={responsable} onChange={e => { setResponsable(e.target.value); setPage(1) }} className={selectCls}>
              <option value="">Responsable</option>
              {responsables.map(r => <option key={r}>{r}</option>)}
            </select>

            {/* Active chips */}
            {clienteId !== '' && <Chip label="Cliente"     value={clientesConCasos.find(c => c.id === clienteId)?.nombre ?? String(clienteId)} onClear={() => { setClienteId(''); setPage(1) }} />}
            {estado           && <Chip label="Estado"      value={estado}      onClear={() => { setEstado('');      setPage(1) }} />}
            {fuero            && <Chip label="Fuero"       value={fuero}       onClear={() => { setFuero('');       setPage(1) }} />}
            {responsable      && <Chip label="Responsable" value={responsable} onClear={() => { setResponsable(''); setPage(1) }} />}

            {hasFilters && (
              <button
                onClick={clearAll}
                className="text-[11px] text-so-muted hover:text-so-text transition-colors ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-so-border bg-so-surface/60 sticky top-0 z-10">
              <tr>
                <ThSort col="nro"             label="N° Exp." />
                <ThSort col="caratula"        label="Carátula" cls="max-w-xs" />
                <ThSort col="cliente"         label="Cliente" />
                <ThSort col="estado"          label="Estado" />
                <ThSort col="responsable"     label="Responsable" />
                <ThSort col="ultimaActuacion" label="Últ. actuación" />
                <ThSort col="vencimiento"     label="Vencimiento" />
                <th className="px-3 py-3 text-right text-[10px] font-medium tracking-widest uppercase text-so-muted whitespace-nowrap">Monto</th>
                <th className="px-3 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-so-border">
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs text-so-muted">
                    No se encontraron expedientes con los filtros aplicados.
                  </td>
                </tr>
              )}
              {pageRows.map((caso, idx) => (
                <tr
                  key={caso.id}
                  onClick={() => setSelected(caso)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-so-ash/10 group',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-so-surface/40'
                  )}
                >
                  <td className="px-3 py-4">
                    <span className="text-xs font-mono font-medium text-so-textMid bg-so-surface px-1.5 py-0.5 border border-so-border">
                      {caso.nro}
                    </span>
                  </td>
                  <td className="px-3 py-4 max-w-xs">
                    <p className="text-sm font-medium text-so-text truncate leading-snug">{caso.caratula}</p>
                    <p className="text-[10px] text-so-muted mt-1">{caso.fuero} · {caso.jurisdiccion}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: clienteColors[caso.clienteId] ?? '#82181a' }}
                      >
                        {caso.clienteNombre[0]}
                      </span>
                      <span className="text-xs text-so-textMid truncate max-w-[130px]">{caso.clienteNombre}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <BadgeEstadoCaso estado={caso.estado} />
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: usuarioColor[caso.responsableId] ?? '#82181a' }}
                      >
                        {usuarioInitials(caso.responsableNombre)}
                      </span>
                      <span className="text-xs text-so-textMid">{caso.responsableNombre.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs text-so-textMid tabular-nums">
                    {caso.ultimaActuacion ? fmtDate(caso.ultimaActuacion) : <span className="text-so-muted">—</span>}
                  </td>
                  <td className="px-3 py-4 text-xs">
                    <VencimientoCell iso={caso.vencimiento} />
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={caso.monto ? 'text-xs font-semibold text-so-text tabular-nums' : 'text-xs text-so-muted'}>
                      {caso.monto ? fmtMoney(caso.monto) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <RowMenu caso={caso} onOpen={() => setSelected(caso)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-so-border text-xs text-so-muted bg-so-surface/30">
          <span className="font-medium text-so-textMid">
            {filtered.length} expedientes &nbsp;·&nbsp; Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-so-surface disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`e${i}`} className="px-1">…</span>
                : <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn('w-6 h-6 rounded text-xs font-medium', page === p ? 'bg-so-red text-white' : 'hover:bg-so-surface')}
                  >
                    {p}
                  </button>
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-so-surface disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

      </div>

      {selected && (
        <ExpedienteModal caso={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
