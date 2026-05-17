'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fmtDateLarga, cn } from '@/lib/utils'
import type { DBPrueba } from '@/lib/queries'

// Parsea el campo observaciones legacy: "TIPO:X | CUAD:A | PERS:nombre"
function parseObs(obs: string | null): { pers: string | null; cuad: string | null; raw: string | null } {
  if (!obs) return { pers: null, cuad: null, raw: null }
  const persMatch = obs.match(/PERS:([^|]+)/i)
  const cuadMatch = obs.match(/CUAD:([^|]+)/i)
  const pers = persMatch ? persMatch[1].trim() : null
  const cuad = cuadMatch ? cuadMatch[1].trim() : null
  // Si el campo NO tiene el patrón legacy, mostrarlo tal cual
  const isLegacy = /TIPO:|CUAD:|PERS:/i.test(obs)
  return { pers, cuad, raw: isLegacy ? null : obs }
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado.toLowerCase().includes('produc') ? 'badge-green' :
    estado.toLowerCase().includes('pendient') ? 'badge-amber' :
    estado.toLowerCase().includes('inadmit') ? 'badge-red' :
    'badge'
  return <span className={cn('badge', cls)}>{estado}</span>
}

const CUAD_LABEL: Record<string, string> = {
  A: 'Actor',
  C: 'Demandado',
  D: 'Demandado',
  B: 'Ambas partes',
}

export default function TabPruebas({ casoId }: { casoId: number }) {
  const [pruebas, setPruebas] = useState<DBPrueba[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/casos/${casoId}/pruebas`)
      .then(r => r.json())
      .then(d => { setPruebas(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [casoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-so-muted">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-[11px] tracking-widest uppercase">Cargando pruebas</span>
      </div>
    )
  }

  if (pruebas.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xs text-so-muted">Sin pruebas registradas para este expediente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] tracking-widest uppercase text-so-muted mb-4">
        {pruebas.length} prueba{pruebas.length !== 1 ? 's' : ''} registrada{pruebas.length !== 1 ? 's' : ''}
      </p>

      <div className="divide-y divide-so-border border border-so-border rounded-lg overflow-hidden">
        {pruebas.map((p, i) => {
          const { pers, cuad, raw } = parseObs(p.observaciones)
          const cuadLabel = cuad ? (CUAD_LABEL[cuad.toUpperCase()] ?? `Cuad. ${cuad}`) : null

          return (
            <div
              key={p.id}
              className={cn('px-4 py-3.5', i % 2 === 0 ? 'bg-transparent' : 'bg-so-surface/30')}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Descripción principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-medium text-so-text">
                      {pers ?? raw ?? p.tipo}
                    </span>
                    <EstadoBadge estado={p.estado} />
                  </div>

                  {/* Metadatos */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-so-muted">{p.tipo}</span>
                    {cuadLabel && (
                      <>
                        <span className="text-so-border">·</span>
                        <span className="text-[10px] text-so-subtle">{cuadLabel}</span>
                      </>
                    )}
                    {p.parte && (
                      <>
                        <span className="text-so-border">·</span>
                        <span className="text-[10px] text-so-subtle">{p.parte}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Fechas */}
                <div className="text-right flex-shrink-0 space-y-0.5">
                  {p.fechaPresentacion && (
                    <div>
                      <span className="text-[9px] tracking-widest uppercase text-so-muted">Presentación</span>
                      <p className="text-[11px] text-so-textMid tabular-nums">{fmtDateLarga(p.fechaPresentacion)}</p>
                    </div>
                  )}
                  {p.fechaVencimiento && (
                    <div>
                      <span className="text-[9px] tracking-widest uppercase text-so-muted">Vencimiento</span>
                      <p className="text-[11px] text-amber-400 tabular-nums">{fmtDateLarga(p.fechaVencimiento)}</p>
                    </div>
                  )}
                  {!p.fechaPresentacion && !p.fechaVencimiento && (
                    <span className="text-[10px] text-so-muted">Sin fechas</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
