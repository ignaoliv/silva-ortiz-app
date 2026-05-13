import { cn } from '@/lib/utils'
import type { EstadoCaso, EstadoAudiencia } from '@/types'

type Variant = 'green' | 'amber' | 'gray' | 'red' | 'blue'

const ESTADO_CASO: Record<EstadoCaso, Variant> = {
  'Activo':     'green',
  'En trámite': 'amber',
  'Archivado':  'gray',
  'Cerrado':    'red',
}

const ESTADO_AUD: Record<EstadoAudiencia, Variant> = {
  'Programada': 'blue',
  'Realizada':  'green',
  'Cancelada':  'gray',
}

export function BadgeEstadoCaso({ estado }: { estado: EstadoCaso }) {
  const v = ESTADO_CASO[estado]
  return <span className={cn('badge', `badge-${v}`)}>{estado}</span>
}

export function BadgeEstadoAudiencia({ estado }: { estado: EstadoAudiencia }) {
  const v = ESTADO_AUD[estado]
  return <span className={cn('badge', `badge-${v}`)}>{estado}</span>
}

export function Badge({ children, variant }: { children: React.ReactNode; variant: Variant }) {
  return <span className={cn('badge', `badge-${variant}`)}>{children}</span>
}
