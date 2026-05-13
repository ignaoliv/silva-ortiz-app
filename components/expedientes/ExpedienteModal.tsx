'use client'
import { useState, useEffect } from 'react'
import { X, FileText, Clock, Calendar, DollarSign } from 'lucide-react'
import type { Caso } from '@/types'
import { fmtDateLarga, fmtMoney, cn } from '@/lib/utils'
import { getCliente, getUsuario, getMovimientos, AUDIENCIAS } from '@/lib/data'
import { BadgeEstadoCaso } from '@/components/ui/Badge'

const TABS = [
  { id: 'detalle',     label: 'Detalles',    icon: FileText  },
  { id: 'movimientos', label: 'Movimientos', icon: Clock     },
  { id: 'audiencias',  label: 'Audiencias',  icon: Calendar  },
  { id: 'honorarios',  label: 'Honorarios',  icon: DollarSign },
]

const MOV_COLORS: Record<string, string> = {
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  orange: 'bg-amber-500',
}

const HONORARIOS = [
  { concepto: 'Honorarios iniciales',    fecha: '2024-02-01', monto: 150000, estado: 'Pagado'    },
  { concepto: 'Segunda cuota',           fecha: '2024-05-01', monto: 150000, estado: 'Pagado'    },
  { concepto: 'Honorarios por audiencia',fecha: '2024-09-15', monto: 80000,  estado: 'Pendiente' },
]

export default function ExpedienteModal({
  caso,
  onClose,
}: {
  caso: Caso
  onClose: () => void
}) {
  const [tab, setTab] = useState('detalle')
  const cliente     = getCliente(caso.cliente_id)
  const responsable = getUsuario(caso.responsable_id)
  const movs        = getMovimientos(caso.id)
  const auds        = AUDIENCIAS.filter(a => a.caso_id === caso.id)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-mono">{caso.nro}</span>
              <BadgeEstadoCaso estado={caso.estado} />
            </div>
            <h2 className="text-base font-semibold text-gray-800 leading-snug">{caso.caratula}</h2>
            <p className="text-xs text-gray-500 mt-1">{caso.juzgado}</p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors',
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'detalle' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ['Expediente',     caso.exp],
                ['Fuero',          caso.fuero],
                ['Jurisdicción',   caso.jurisdiccion],
                ['Tipo',           caso.tipo],
                ['Cliente',        cliente.nombre],
                ['Responsable',    responsable.nombre],
                ['Fecha de alta',  fmtDateLarga(caso.fecha_alta)],
                ['Notificación',   fmtDateLarga(caso.fecha_notif)],
                ['Vencimiento',    fmtDateLarga(caso.vencimiento)],
                ['Monto en juego', caso.monto ? fmtMoney(caso.monto) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'movimientos' && (
            <ol className="relative border-l border-gray-200 ml-3 space-y-6">
              {movs.map(m => (
                <li key={m.id} className="ml-6">
                  <span className={cn(
                    'absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white',
                    MOV_COLORS[m.color]
                  )} />
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{m.titulo}</span>
                    <span className="text-xs text-gray-400">{m.tipo}</span>
                  </div>
                  <p className="text-xs text-gray-600">{m.desc}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{m.user}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{fmtDateLarga(m.fecha)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {tab === 'audiencias' && (
            <div>
              {auds.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin audiencias registradas</p>
              ) : (
                <ul className="space-y-3">
                  {auds.map(a => (
                    <li key={a.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-50">
                      <div className="text-center w-12 flex-shrink-0">
                        <p className="text-xl font-bold text-gray-700 leading-none">
                          {a.fecha.split('-')[2]}
                        </p>
                        <p className="text-xs text-gray-400">
                          {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(a.fecha.split('-')[1]) - 1]}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{a.tipo}</p>
                        <p className="text-xs text-gray-500">{a.hora} · {a.lugar}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{a.abogado} · {a.modalidad}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'honorarios' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-2 text-xs text-gray-500 font-medium">Concepto</th>
                  <th className="pb-2 text-xs text-gray-500 font-medium">Fecha</th>
                  <th className="pb-2 text-xs text-gray-500 font-medium text-right">Monto</th>
                  <th className="pb-2 text-xs text-gray-500 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {HONORARIOS.map(h => (
                  <tr key={h.concepto}>
                    <td className="py-2.5 text-gray-700">{h.concepto}</td>
                    <td className="py-2.5 text-gray-500">{fmtDateLarga(h.fecha)}</td>
                    <td className="py-2.5 text-right font-medium">{fmtMoney(h.monto)}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn(
                        'badge',
                        h.estado === 'Pagado' ? 'badge-green' : 'badge-amber'
                      )}>
                        {h.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={2} className="pt-3 text-xs font-semibold text-gray-600">Total</td>
                  <td className="pt-3 text-right font-bold text-gray-800">
                    {fmtMoney(HONORARIOS.reduce((s, h) => s + h.monto, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
