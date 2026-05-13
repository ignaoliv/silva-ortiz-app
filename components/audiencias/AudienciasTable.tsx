'use client'
import { useState, useMemo } from 'react'
import { Search, Video, MapPin } from 'lucide-react'
import type { Audiencia, EstadoAudiencia, ModalidadAudiencia } from '@/types'
import { fmtDate, cn } from '@/lib/utils'
import { AUDIENCIAS } from '@/lib/data'
import { BadgeEstadoAudiencia } from '@/components/ui/Badge'

const ESTADOS: EstadoAudiencia[]   = ['Programada', 'Realizada', 'Cancelada']
const MODALIDADES: ModalidadAudiencia[] = ['Presencial', 'Virtual']

export default function AudienciasTable() {
  const [query,     setQuery]     = useState('')
  const [estado,    setEstado]    = useState('')
  const [modalidad, setModalidad] = useState('')

  const filtered = useMemo(() => {
    let rows = AUDIENCIAS
    if (query)     rows = rows.filter(a =>
      a.caratula.toLowerCase().includes(query.toLowerCase()) ||
      a.tipo.toLowerCase().includes(query.toLowerCase()) ||
      a.abogado.toLowerCase().includes(query.toLowerCase())
    )
    if (estado)    rows = rows.filter(a => a.estado    === estado)
    if (modalidad) rows = rows.filter(a => a.modalidad === modalidad)
    return [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
  }, [query, estado, modalidad])

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar audiencia..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select
          value={estado}
          onChange={e => setEstado(e.target.value)}
          className="btn text-xs pr-7"
        >
          <option value="">Estado</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
        <select
          value={modalidad}
          onChange={e => setModalidad(e.target.value)}
          className="btn text-xs pr-7"
        >
          <option value="">Modalidad</option>
          {MODALIDADES.map(m => <option key={m}>{m}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} audiencias</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Fecha / Hora</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Carátula</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Tipo</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Lugar</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Abogado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-3 py-3 whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-700">{fmtDate(a.fecha)}</p>
                  <p className="text-xs text-gray-400">{a.hora}</p>
                </td>
                <td className="px-3 py-3 max-w-[260px]">
                  <p className="text-sm text-gray-700 truncate">{a.caratula}</p>
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-gray-600">{a.tipo}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {a.modalidad === 'Virtual'
                      ? <Video size={11} className="text-blue-400 flex-shrink-0" />
                      : <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    }
                    <span className="truncate max-w-[160px]">{a.lugar}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600">{a.abogado}</td>
                <td className="px-3 py-3">
                  <BadgeEstadoAudiencia estado={a.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
