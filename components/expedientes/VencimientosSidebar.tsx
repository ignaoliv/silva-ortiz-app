import type { DBCaso } from '@/lib/queries'
import { diffDays, fmtDateShort, cn } from '@/lib/utils'

function urgencyColor(days: number) {
  if (days < 0)  return 'text-red-400 font-medium'
  if (days <= 3) return 'text-red-400 font-medium'
  if (days <= 7) return 'text-amber-400 font-medium'
  return 'text-so-textMid'
}
function urgencyAccent(days: number) {
  if (days < 0)  return 'border-l-2 border-red-600'
  if (days <= 3) return 'border-l-2 border-red-700'
  if (days <= 7) return 'border-l-2 border-amber-700'
  return 'border-l-2 border-so-border'
}

export default function VencimientosSidebar({ casos }: { casos: DBCaso[] }) {
  const proximos = casos
    .filter(c => c.vencimiento && !c.cerrado)
    .map(c => ({ ...c, diff: diffDays(c.vencimiento!) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 10)

  return (
    <div className="card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-so-border">
        <p className="text-[10px] tracking-widest uppercase text-so-muted">Vencimientos</p>
      </div>
      <ul className="divide-y divide-so-border overflow-y-auto flex-1">
        {proximos.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-so-muted">Sin vencimientos próximos</li>
        )}
        {proximos.map(c => {
          const fecha = fmtDateShort(c.vencimiento!)
          return (
            <li key={c.id} className={cn('px-4 py-3 pl-3', urgencyAccent(c.diff))}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-so-muted font-mono mb-0.5">{c.nro}</p>
                  <p className="text-xs text-so-text truncate leading-snug">{c.caratula}</p>
                  <p className="text-[10px] text-so-subtle mt-0.5">{c.clienteNombre}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-light text-so-text leading-none">{fecha.day}</p>
                  <p className="text-[10px] text-so-subtle">{fecha.mon}</p>
                  <p className={cn('text-[10px] mt-1', urgencyColor(c.diff))}>
                    {c.diff < 0 ? `Hace ${Math.abs(c.diff)}d` : c.diff === 0 ? 'Hoy' : `${c.diff}d`}
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
