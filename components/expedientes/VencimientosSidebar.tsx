import type { Caso } from '@/types'
import { diffDays, fmtDateShort, cn } from '@/lib/utils'
import { getCliente as getClienteData } from '@/lib/data'

function urgencyColor(days: number): string {
  if (days < 0)  return 'text-red-600 font-semibold'
  if (days <= 3) return 'text-red-500 font-semibold'
  if (days <= 7) return 'text-amber-600 font-semibold'
  return 'text-gray-500'
}

function urgencyBorder(days: number): string {
  if (days < 0)  return 'border-t-2 border-red-500'
  if (days <= 3) return 'border-t-2 border-red-400'
  if (days <= 7) return 'border-t-2 border-amber-400'
  return 'border-t-2 border-gray-200'
}

export default function VencimientosSidebar({ casos }: { casos: Caso[] }) {
  const proximos = casos
    .filter(c => c.vencimiento && !c.cerrado)
    .map(c => ({ ...c, diff: diffDays(c.vencimiento!) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 8)

  return (
    <div className="card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Vencimientos próximos</h2>
      </div>
      <ul className="divide-y divide-gray-50 overflow-y-auto flex-1">
        {proximos.map(c => {
          const fecha = fmtDateShort(c.vencimiento!)
          const cliente = getClienteData(c.cliente_id)
          return (
            <li key={c.id} className={cn('px-4 py-3', urgencyBorder(c.diff))}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{c.nro}</p>
                  <p className="text-xs font-medium text-gray-700 truncate">{c.caratula}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cliente.nombre}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-gray-700 leading-none">{fecha.day}</p>
                  <p className="text-xs text-gray-400">{fecha.mon}</p>
                  <p className={cn('text-xs mt-1', urgencyColor(c.diff))}>
                    {c.diff < 0
                      ? `Hace ${Math.abs(c.diff)}d`
                      : c.diff === 0
                      ? 'Hoy'
                      : `${c.diff}d`}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
