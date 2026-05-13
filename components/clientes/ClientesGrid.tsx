'use client'
import { useState, useMemo } from 'react'
import { Search, Building2, User, Briefcase, Mail, Phone } from 'lucide-react'
import type { Cliente } from '@/types'
import { CLIENTES, CASOS } from '@/lib/data'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

export default function ClientesGrid() {
  const [query, setQuery] = useState('')
  const [tipo,  setTipo]  = useState('')

  const filtered = useMemo(() => {
    let rows = CLIENTES
    if (query) rows = rows.filter(c =>
      c.nombre.toLowerCase().includes(query.toLowerCase()) ||
      c.cuit.includes(query)
    )
    if (tipo) rows = rows.filter(c => c.tipo === tipo)
    return rows
  }, [query, tipo])

  const casosActivos = (clienteId: number) =>
    CASOS.filter(c => c.cliente_id === clienteId && !c.cerrado).length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente o CUIT..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
          />
        </div>
        <select
          value={tipo}
          onChange={e => setTipo(e.target.value)}
          className="btn text-xs pr-7"
        >
          <option value="">Todos</option>
          <option value="Persona física">Persona física</option>
          <option value="Persona jurídica">Persona jurídica</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} clientes</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(c => {
          const activos = casosActivos(c.id)
          const isJuridica = c.tipo === 'Persona jurídica'
          return (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow cursor-default">
              {/* Avatar + name */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: c.color }}
                >
                  {isJuridica
                    ? <Building2 size={18} />
                    : c.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isJuridica
                      ? <span className="flex items-center gap-1"><Building2 size={10} /> Persona jurídica</span>
                      : <span className="flex items-center gap-1"><User size={10} /> Persona física</span>
                    }
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-mono">CUIT</span>
                  <span>{c.cuit}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail size={11} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400 flex-shrink-0" />
                  <span>{c.tel}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Briefcase size={12} className="text-gray-400" />
                  <span>{c.casos} expediente{c.casos !== 1 ? 's' : ''}</span>
                </div>
                {activos > 0 && (
                  <Badge variant="green">{activos} activo{activos !== 1 ? 's' : ''}</Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
