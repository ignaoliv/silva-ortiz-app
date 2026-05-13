'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Audiencia } from '@/types'
import { cn } from '@/lib/utils'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_CORTOS = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

export default function MiniCalendar({ audiencias }: { audiencias: Audiencia[] }) {
  const hoy   = new Date()
  const [year, setYear]   = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())

  const diasConAud = new Set(
    audiencias
      .filter(a => {
        const [ay, am] = a.fecha.split('-').map(Number)
        return ay === year && am - 1 === month
      })
      .map(a => parseInt(a.fecha.split('-')[2]))
  )

  const firstDay  = new Date(year, month, 1).getDay()
  const offset    = (firstDay + 6) % 7 // lunes = 0
  const daysInMo  = new Date(year, month + 1, 0).getDate()

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => i + 1),
  ]

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronLeft size={16} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {MESES[month]} {year}
        </span>
        <button onClick={next} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_CORTOS.map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isHoy    = day === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()
          const hasAud   = diasConAud.has(day)
          return (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-colors',
                isHoy  ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              {day}
              {hasAud && (
                <span className={cn('w-1 h-1 rounded-full mt-0.5', isHoy ? 'bg-blue-200' : 'bg-blue-500')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        <span className="text-[11px] text-gray-400">Día con audiencia</span>
      </div>
    </div>
  )
}
