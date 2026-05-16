import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** "12/05/26" */
export function fmtDate(iso: string): string {
  const [y, m, day] = iso.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

/** { day: 12, mon: 'May' } */
export function fmtDateShort(iso: string): { day: number; mon: string } {
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const [, m, day] = iso.split('-')
  return { day: parseInt(day), mon: MESES[parseInt(m) - 1] }
}

/** "12 de mayo de 2026" */
export function fmtDateLarga(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** Diferencia en días desde hoy (negativo = pasado) */
export function diffDays(iso: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

/** "16/05 07:14" en horario de Buenos Aires — acepta Date o string ISO */
export function fmtDateTime(value: Date | string | null): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day:    '2-digit',
    month:  '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '')
}

/** "$1.234.567" */
export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

/** Iniciales de un nombre: "Iván Ortiz" → "IO" */
export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('')
}
