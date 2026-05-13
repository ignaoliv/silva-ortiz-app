'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Caso, SortCol, SortDir, EstadoCaso } from '@/types'
import { fmtDate, fmtMoney, diffDays, cn } from '@/lib/utils'
import { getCliente, getUsuario, CASOS } from '@/lib/data'
import { BadgeEstadoCaso } from '@/components/ui/Badge'
import ExpedienteModal from './ExpedienteModal'

const PAGE_SIZE = 8

const ESTADOS: EstadoCaso[] = ['Activo', 'En trámite', 'Archivado', 'Cerrado']
const FUEROS  = Array.from(new Set(CASOS.map(c => c.fuero))).sort()
const RESPONSABLES = Array.from(new Set(CASOS.map(c => getUsuario(c.responsable_id).nombre))).sort()

function VencimientoCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-gray-400">—</span>
  const diff = diffDays(iso)
  const cls = diff < 0 ? 'text-red-600 font-semibold' : diff <= 3 ? 'text-red-500 font-semibold' : diff <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-600'
  return <span className={cls}>{fmtDate(iso)}</span>
}

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronUp size={12} className="text-gray-300" />
  return dir === 1 ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
}

function exportCSV(rows: Caso[]) {
  const head = 'N°,Carátula,Cliente,Estado,Responsable,Fuero,Vencimiento,Monto'
  const body = rows.map(c => [
    c.nro,
    `"${c.caratula}"`,
    `"${getCliente(c.cliente_id).nombre}"`,
    c.estado,
    getUsuario(c.responsable_id).nombre,
    c.fuero,
    c.vencimiento ?? '—',
    c.monto,
  ].join(',')).join('\n')
  const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'expedientes.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function ExpedientesTable() {
  const [query,       setQuery]       = useState('')
  const [estado,      setEstado]      = useState('')
  const [fuero,       setFuero]       = useState('')
  const [responsable, setResponsable] = useState('')
  const [sortCol,     setSortCol]     = useState<SortCol>('vencimiento')
  const [sortDir,     setSortDir]     = useState<SortDir>(1)
  const [page,        setPage]        = useState(1)
  const [selected,    setSelected]    = useState<Caso | null>(null)

  function toggleSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(1) }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let rows = CASOS
    if (query)       rows = rows.filter(c => c.caratula.toLowerCase().includes(query.toLowerCase()) || c.nro.toLowerCase().includes(query.toLowerCase()))
    if (estado)      rows = rows.filter(c => c.estado === estado)
    if (fuero)       rows = rows.filter(c => c.fuero  === fuero)
    if (responsable) rows = rows.filter(c => getUsuario(c.responsable_id).nombre === responsable)

    rows = [...rows].sort((a, b) => {
      let va: string | number = '', vb: string | number = ''
      if (sortCol === 'nro')          { va = a.nro;                             vb = b.nro }
      if (sortCol === 'caratula')     { va = a.caratula;                        vb = b.caratula }
      if (sortCol === 'cliente')      { va = getCliente(a.cliente_id).nombre;   vb = getCliente(b.cliente_id).nombre }
      if (sortCol === 'estado')       { va = a.estado;                          vb = b.estado }
      if (sortCol === 'responsable')  { va = getUsuario(a.responsable_id).nombre; vb = getUsuario(b.responsable_id).nombre }
      if (sortCol === 'vencimiento')  { va = a.vencimiento ?? 'z';              vb = b.vencimiento ?? 'z' }
      return va < vb ? -sortDir : va > vb ? sortDir : 0
    })
    return rows
  }, [query, estado, fuero, responsable, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function th(col: SortCol, label: string, cls = '') {
    return (
      <th
        className={cn('px-3 py-2.5 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap', cls)}
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon col={col} active={sortCol} dir={sortDir} />
        </span>
      </th>
    )
  }

  return (
    <>
      <div className="card flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar expediente..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <select
            value={estado}
            onChange={e => { setEstado(e.target.value); setPage(1) }}
            className="btn text-xs pr-7"
          >
            <option value="">Estado</option>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>

          <select
            value={fuero}
            onChange={e => { setFuero(e.target.value); setPage(1) }}
            className="btn text-xs pr-7"
          >
            <option value="">Fuero</option>
            {FUEROS.map(f => <option key={f}>{f}</option>)}
          </select>

          <select
            value={responsable}
            onChange={e => { setResponsable(e.target.value); setPage(1) }}
            className="btn text-xs pr-7"
          >
            <option value="">Responsable</option>
            {RESPONSABLES.map(r => <option key={r}>{r}</option>)}
          </select>

          <button onClick={() => exportCSV(filtered)} className="btn text-xs ml-auto">
            <Download size={13} /> CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                {th('nro',         'N° Expediente')}
                {th('caratula',    'Carátula',       'max-w-xs')}
                {th('cliente',     'Cliente')}
                {th('estado',      'Estado')}
                {th('responsable', 'Responsable')}
                {th('vencimiento', 'Vencimiento')}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.map(caso => {
                const cliente     = getCliente(caso.cliente_id)
                const responsable = getUsuario(caso.responsable_id)
                return (
                  <tr
                    key={caso.id}
                    onClick={() => setSelected(caso)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono text-gray-500">{caso.nro}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <p className="text-sm text-gray-700 truncate">{caso.caratula}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: cliente.color }}
                        >
                          {cliente.nombre[0]}
                        </span>
                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{cliente.nombre}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <BadgeEstadoCaso estado={caso.estado} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: responsable.color }}
                        >
                          {responsable.iniciales}
                        </span>
                        <span className="text-xs text-gray-600">{responsable.nombre.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <VencimientoCell iso={caso.vencimiento} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-600">
                      {caso.monto ? fmtMoney(caso.monto) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
          <span>{filtered.length} expedientes · pág. {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      'w-6 h-6 rounded text-xs font-medium',
                      page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {selected && <ExpedienteModal caso={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
