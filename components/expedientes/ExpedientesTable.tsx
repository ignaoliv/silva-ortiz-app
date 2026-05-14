'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtDate, fmtMoney, diffDays, cn } from '@/lib/utils'
import type { DBCaso, DBCliente, DBUsuario } from '@/lib/queries'
import { BadgeEstadoCaso } from '@/components/ui/Badge'
import ExpedienteModal from './ExpedienteModal'

const PAGE_SIZE = 10
type SortCol = 'nro' | 'caratula' | 'cliente' | 'estado' | 'responsable' | 'vencimiento'
type SortDir = 1 | -1

function VencimientoCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-so-muted">—</span>
  const diff = diffDays(iso)
  const cls = diff < 0 ? 'text-red-400 font-medium' : diff <= 3 ? 'text-red-400' : diff <= 7 ? 'text-amber-400' : 'text-so-textMid'
  return <span className={cls}>{fmtDate(iso)}</span>
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronUp size={11} className="text-so-border" />
  return dir === 1 ? <ChevronUp size={11} className="text-so-red" /> : <ChevronDown size={11} className="text-so-red" />
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

interface Props { casos: DBCaso[]; clientes: DBCliente[]; usuarios: DBUsuario[] }

export default function ExpedientesTable({ casos, clientes, usuarios }: Props) {
  const fueros       = useMemo(() => Array.from(new Set(casos.map(c => c.fuero))).sort(), [casos])
  const responsables = useMemo(() => Array.from(new Set(casos.map(c => c.responsableNombre))).sort(), [casos])
  const estados      = useMemo(() => Array.from(new Set(casos.map(c => c.estado))).sort(), [casos])

  const [query,        setQuery]       = useState('')
  const [estado,       setEstado]      = useState('')
  const [fuero,        setFuero]       = useState('')
  const [responsable,  setResponsable] = useState('')
  const [sortCol,      setSortCol]     = useState<SortCol>('vencimiento')
  const [sortDir,      setSortDir]     = useState<SortDir>(1)
  const [page,         setPage]        = useState(1)
  const [selected,     setSelected]    = useState<DBCaso | null>(null)

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(1) }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = casos
    if (query)       rows = rows.filter(c => c.caratula.toLowerCase().includes(query.toLowerCase()) || c.nro.toLowerCase().includes(query.toLowerCase()))
    if (estado)      rows = rows.filter(c => c.estado      === estado)
    if (fuero)       rows = rows.filter(c => c.fuero       === fuero)
    if (responsable) rows = rows.filter(c => c.responsableNombre === responsable)
    return [...rows].sort((a, b) => {
      let va = '', vb = ''
      if (sortCol === 'nro')         { va = a.nro;              vb = b.nro }
      if (sortCol === 'caratula')    { va = a.caratula;         vb = b.caratula }
      if (sortCol === 'cliente')     { va = a.clienteNombre;    vb = b.clienteNombre }
      if (sortCol === 'estado')      { va = a.estado;           vb = b.estado }
      if (sortCol === 'responsable') { va = a.responsableNombre; vb = b.responsableNombre }
      if (sortCol === 'vencimiento') { va = a.vencimiento ?? 'z'; vb = b.vencimiento ?? 'z' }
      return va < vb ? -sortDir : va > vb ? sortDir : 0
    })
  }, [casos, query, estado, fuero, responsable, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectCls  = 'bg-so-surface border border-so-border text-so-textMid text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-so-muted cursor-pointer'

  function ThSort({ col, label, cls = '' }: { col: SortCol; label: string; cls?: string }) {
    return (
      <th className={cn('px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-so-muted cursor-pointer select-none', cls)}
          onClick={() => toggleSort(col)}>
        <span className="inline-flex items-center gap-1">{label}<SortIcon col={col} active={sortCol} dir={sortDir} /></span>
      </th>
    )
  }

  // Lookup maps
  const clienteColors = useMemo(() => {
    const colors = ['#82181a','#2563eb','#059669','#d97706','#7c3aed','#0891b2','#dc2626','#0284c7']
    return Object.fromEntries(clientes.map((c, i) => [c.id, colors[i % colors.length]]))
  }, [clientes])

  const usuarioInitials = (nombre: string) => nombre.split(' ').slice(0, 2).map(w => w[0]).join('')
  const usuarioColor = useMemo(() => {
    const colors = ['#82181a','#2563eb','#059669','#d97706','#7c3aed','#0891b2']
    return Object.fromEntries(usuarios.map((u, i) => [u.id, colors[i % colors.length]]))
  }, [usuarios])

  return (
    <>
      <div className="card flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 border-b border-so-border bg-so-surface/50">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-so-muted" />
            <input type="text" placeholder="Buscar expediente..." value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="input w-full pl-8" />
          </div>
          <select value={estado}      onChange={e => { setEstado(e.target.value);      setPage(1) }} className={selectCls}>
            <option value="">Estado</option>
            {estados.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={fuero}       onChange={e => { setFuero(e.target.value);       setPage(1) }} className={selectCls}>
            <option value="">Fuero</option>
            {fueros.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={responsable} onChange={e => { setResponsable(e.target.value); setPage(1) }} className={selectCls}>
            <option value="">Responsable</option>
            {responsables.map(r => <option key={r}>{r}</option>)}
          </select>
          <button onClick={() => exportCSV(filtered)} className="btn ml-auto">
            <Download size={12} /> Exportar CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-so-border">
              <tr>
                <ThSort col="nro"         label="N° Exp." />
                <ThSort col="caratula"    label="Carátula" cls="max-w-xs" />
                <ThSort col="cliente"     label="Cliente" />
                <ThSort col="estado"      label="Estado" />
                <ThSort col="responsable" label="Responsable" />
                <ThSort col="vencimiento" label="Vencimiento" />
                <th className="px-3 py-3 text-right text-[10px] font-medium tracking-widest uppercase text-so-muted">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-so-border">
              {pageRows.map((caso, idx) => (
                <tr key={caso.id} onClick={() => setSelected(caso)} className={`cursor-pointer transition-colors hover:bg-so-ash/10 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-so-surface/40'}`}>
                  <td className="px-3 py-4">
                    <span className="text-xs font-mono font-medium text-so-textMid bg-so-surface px-1.5 py-0.5 border border-so-border">{caso.nro}</span>
                  </td>
                  <td className="px-3 py-4 max-w-xs">
                    <p className="text-sm font-medium text-so-text truncate leading-snug">{caso.caratula}</p>
                    <p className="text-[10px] text-so-muted mt-1">{caso.fuero} · {caso.jurisdiccion}</p>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                            style={{ backgroundColor: clienteColors[caso.clienteId] ?? '#82181a' }}>
                        {caso.clienteNombre[0]}
                      </span>
                      <span className="text-xs text-so-textMid truncate max-w-[130px]">{caso.clienteNombre}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4"><BadgeEstadoCaso estado={caso.estado} /></td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                            style={{ backgroundColor: usuarioColor[caso.responsableId] ?? '#82181a' }}>
                        {usuarioInitials(caso.responsableNombre)}
                      </span>
                      <span className="text-xs text-so-textMid">{caso.responsableNombre.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs"><VencimientoCell iso={caso.vencimiento} /></td>
                  <td className="px-3 py-4 text-right">
                    <span className={caso.monto ? 'text-xs font-semibold text-so-text tabular-nums' : 'text-xs text-so-muted'}>
                      {caso.monto ? fmtMoney(caso.monto) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-so-border text-xs text-so-muted bg-so-surface/30">
          <span className="font-medium text-so-textMid">{filtered.length} expedientes &nbsp;·&nbsp; Página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1 rounded hover:bg-so-surface disabled:opacity-30"><ChevronLeft size={13} /></button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p); return acc
              }, [])
              .map((p, i) => p === '...'
                ? <span key={`e${i}`} className="px-1">…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                          className={cn('w-6 h-6 rounded text-xs font-medium', page === p ? 'bg-so-red text-white' : 'hover:bg-so-surface')}>
                    {p}
                  </button>
              )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1 rounded hover:bg-so-surface disabled:opacity-30"><ChevronRight size={13} /></button>
          </div>
        </div>
      </div>

      {selected && (
        <ExpedienteModal caso={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
