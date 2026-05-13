'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Audiencia } from '@/types'
import { cn } from '@/lib/utils'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS  = ['Lu','Ma','Mi','Ju','Vi','Sa','Do']

export default function MiniCalendar({ audiencias }: { audiencias: Audiencia[] }) {
  const hoy = new Date()
  const [year, setYear]   = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())

  const diasConAud = new Set(
    audiencias
      .filter(a => { const [ay, am] = a.fecha.split('-').map(Number); return ay === year && am - 1 === month })
      .map(a => parseInt(a.fecha.split('-')[2]))
  )

  const offset    = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMo  = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)]

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1 hover:bg-so-surface rounded transition-colors">
          <ChevronLeft size={14} className="text-so-muted" />
        </button>
        <span className="text-xs font-medium tracking-wide text-so-text">{MESES[month]} {year}</span>
        <button onClick={next} className="p-1 hover:bg-so-surface rounded transition-colors">
          <ChevronRight size={14} className="text-so-muted" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DIAS.map(d => <div key={d} className="text-center text-[9px] tracking-widest uppercase text-so-muted py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const isHoy  = day === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()
          const hasAud = diasConAud.has(day)
          return (
            <div key={i} className={cn(
              'flex flex-col items-center justify-center h-8 rounded text-xs font-medium transition-colors',
              isHoy ? 'bg-so-red text-white' : 'text-so-textMid hover:bg-so-surface'
            )}>
              {day}
              {hasAud && <span className={cn('w-1 h-1 rounded-full mt-0.5', isHoy ? 'bg-red-300' : 'bg-so-red')} />}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-so-border">
        <span className="w-2 h-2 rounded-full bg-so-red flex-shrink-0" />
        <span className="text-[10px] text-so-muted">Día con audiencia</span>
      </div>
    </div>
  )
}
