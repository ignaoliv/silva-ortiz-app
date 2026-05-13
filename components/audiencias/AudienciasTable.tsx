'use client'
import { useState, useMemo } from 'react'
import { Search, Video, MapPin } from 'lucide-react'
import type { DBAudiencia } from '@/lib/queries'
import { fmtDate, cn } from '@/lib/utils'
import { BadgeEstadoAudiencia } from '@/components/ui/Badge'

const selectClass = 'bg-so-surface border border-so-border text-so-textMid text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-so-muted cursor-pointer'

export default function AudienciasTable({ audiencias }: { audiencias: DBAudiencia[] }) {
  const [query,     setQuery]     = useState('')
  const [estado,    setEstado]    = useState('')
  const [modalidad, setModalidad] = useState('')

  const estados    = useMemo(() => Array.from(new Set(audiencias.map(a => a.estado))).sort(), [audiencias])
  const modalidades = ['Presencial', 'Virtual']

  const filtered = useMemo(() => {
    let rows = audiencias
    if (query)     rows = rows.filter(a =>
      a.caratula.toLowerCase().includes(query.toLowerCase()) ||
      a.tipo.toLowerCase().includes(query.toLowerCase()) ||
      a.abogado.toLowerCase().includes(query.toLowerCase())
    )
    if (estado)    rows = rows.filter(a => a.estado    === estado)
    if (modalidad) rows = rows.filter(a => a.modalidad === modalidad)
    return [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
  }, [audiencias, query, estado, modalidad])

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 px-3 py-3 border-b border-so-border">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-so-muted" />
          <input type="text" placeholder="Buscar audiencia..." value={query}
            onChange={e => setQuery(e.target.value)} className="input w-full pl-8" />
        </div>
        <select value={estado}    onChange={e => setEstado(e.target.value)}    className={selectClass}>
          <option value="">Estado</option>
          {estados.map(e => <option key={e}>{e}</option>)}
        </select>
        <select value={modalidad} onChange={e => setModalidad(e.target.value)} className={selectClass}>
          <option value="">Modalidad</option>
          {modalidades.map(m => <option key={m}>{m}</option>)}
        </select>
        <span className="ml-auto text-[10px] tracking-widest uppercase text-so-muted">{filtered.length} audiencias</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-so-border">
            <tr>
              {['Fecha / Hora', 'Carátula', 'Tipo', 'Lugar', 'Abogado', 'Estado'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-medium tracking-widest uppercase text-so-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-so-border">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-so-muted">Sin audiencias</td></tr>
            )}
            {filtered.map(a => (
              <tr key={a.id} className="table-row-hover">
                <td className="px-3 py-3 whitespace-nowrap">
                  <p className="text-sm font-medium text-so-text">{fmtDate(a.fecha)}</p>
                  <p className="text-[11px] text-so-muted">{a.hora}</p>
                </td>
                <td className="px-3 py-3 max-w-[240px]">
                  <p className="text-sm text-so-text truncate">{a.caratula}</p>
                </td>
                <td className="px-3 py-3 text-xs text-so-subtle">{a.tipo}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-xs text-so-muted">
                    {a.modalidad === 'Virtual'
                      ? <Video size={11} className="text-blue-500 flex-shrink-0" />
                      : <MapPin size={11} className="text-so-muted flex-shrink-0" />}
                    <span className="truncate max-w-[150px]">{a.lugar}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-so-textMid">{a.abogado}</td>
                <td className="px-3 py-3"><BadgeEstadoAudiencia estado={a.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
