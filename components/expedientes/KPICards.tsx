import { Briefcase, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'

interface KPIs {
  total: number
  activos: number
  en7dias: number
  audSemana: number
}

export default function KPICards({ kpis }: { kpis: KPIs }) {
  const cards = [
    {
      label: 'Total expedientes',
      value: kpis.total.toLocaleString('es-AR'),
      icon: Briefcase,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Activos',
      value: kpis.activos.toLocaleString('es-AR'),
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Vencen en 7 días',
      value: kpis.en7dias.toString(),
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Audiencias esta semana',
      value: kpis.audSemana.toString(),
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div key={c.label} className="card px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={c.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
