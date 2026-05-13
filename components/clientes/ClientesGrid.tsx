'use client'
import { useState, useMemo } from 'react'
import { Search, Building2, User, Briefcase, Mail, Phone } from 'lucide-react'
import { CLIENTES, CASOS } from '@/lib/data'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const selectClass = 'bg-so-surface border border-so-border text-so-textMid text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-so-muted cursor-pointer'

export default function ClientesGrid() {
  const [query, setQuery] = useState('')
  const [tipo,  setTipo]  = useState('')

  const filtered = useMemo(() => {
    let rows = CLIENTES
    if (query) rows = rows.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()) || c.cuit.includes(query))
    if (tipo)  rows = rows.filter(c => c.tipo === tipo)
    return rows
  }, [query, tipo])

  const casosActivos = (id: number) => CASOS.filter(c => c.cliente_id === id && !c.cerrado).length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-so-muted" />
          <input type="text" placeholder="Buscar cliente o CUIT..." value={query}
            onChange={e => setQuery(e.target.value)} className="input w-full pl-8" />
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)} className={selectClass}>
          <option value="">Todos</option>
          <option value="Persona física">Persona física</option>
          <option value="Persona jurídica">Persona jurídica</option>
        </select>
        <span className="text-[10px] tracking-widest uppercase text-so-muted">{filtered.length} clientes</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(c => {
          const activos    = casosActivos(c.id)
          const isJuridica = c.tipo === 'Persona jurídica'
          return (
            <div key={c.id} className="card p-5 hover:border-so-muted transition-colors cursor-default">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     style={{ backgroundColor: c.color }}>
                  {isJuridica ? <Building2 size={16} /> : c.nombre.split(' ').slice(0, 2).map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-so-text truncate">{c.nombre}</p>
                  <p className="text-[10px] text-so-muted mt-0.5 flex items-center gap-1">
                    {isJuridica ? <><Building2 size={9} /> Persona jurídica</> : <><User size={9} /> Persona física</>}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-so-subtle mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-so-muted font-mono text-[10px]">CUIT</span>
                  <span className="text-so-textMid">{c.cuit}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail size={10} className="text-so-muted flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={10} className="text-so-muted flex-shrink-0" />
                  <span>{c.tel}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-so-border">
                <div className="flex items-center gap-1 text-[11px] text-so-muted">
                  <Briefcase size={11} />
                  <span>{c.casos} exp.</span>
                </div>
                {activos > 0 && <Badge variant="green">{activos} activo{activos !== 1 ? 's' : ''}</Badge>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
