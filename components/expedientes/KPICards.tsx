import { Briefcase, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'

interface KPIs {
  total: number
  activos: number
  en7dias: number
  audSemana: number
}

export default function KPICards({ kpis }: { kpis: KPIs }) {
  const cards = [
    { label: 'Total expedientes',       value: kpis.total.toLocaleString('es-AR'),   icon: Briefcase,     accent: 'text-so-textMid',   dot: 'bg-so-muted'    },
    { label: 'Activos',                  value: kpis.activos.toLocaleString('es-AR'),  icon: CheckCircle,   accent: 'text-emerald-400',  dot: 'bg-emerald-500' },
    { label: 'Vencen en 7 días',         value: kpis.en7dias.toString(),               icon: AlertTriangle, accent: 'text-amber-400',    dot: 'bg-amber-500'   },
    { label: 'Audiencias esta semana',   value: kpis.audSemana.toString(),             icon: Calendar,      accent: 'text-blue-400',     dot: 'bg-blue-500'    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div key={c.label} className="card px-5 py-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-so-subtle tracking-wide uppercase">{c.label}</p>
              <Icon size={14} className={c.accent} />
            </div>
            <p className="text-3xl font-light text-so-text">{c.value}</p>
            <div className={`mt-3 h-0.5 w-8 rounded ${c.dot} opacity-60`} />
          </div>
        )
      })}
    </div>
  )
}
