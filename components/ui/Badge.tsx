import { cn } from '@/lib/utils'

type Variant = 'green' | 'amber' | 'gray' | 'red' | 'blue'

function estadoVariant(estado: string): Variant {
  if (estado === 'Cerrado' || estado === 'Terminado / Homologado') return 'gray'
  if (['Sentencia 1ra Instancia', 'Apelación / 2da Instancia', 'Sentencia 2da Instancia'].includes(estado)) return 'red'
  if (['Audiencia Preliminar', 'Abierto a Prueba', 'Alegatos'].includes(estado)) return 'amber'
  if (['Iniciado', 'Notificado', 'Contestación de Demanda'].includes(estado)) return 'green'
  return 'blue'
}

function audVariant(estado: string): Variant {
  if (estado === 'Realizada') return 'green'
  if (estado === 'Cancelada') return 'gray'
  return 'blue'
}

export function BadgeEstadoCaso({ estado }: { estado: string }) {
  const v = estadoVariant(estado)
  return <span className={cn('badge', `badge-${v}`)}>{estado}</span>
}

export function BadgeEstadoAudiencia({ estado }: { estado: string }) {
  const v = audVariant(estado)
  return <span className={cn('badge', `badge-${v}`)}>{estado}</span>
}

export function Badge({ children, variant }: { children: React.ReactNode; variant: Variant }) {
  return <span className={cn('badge', `badge-${variant}`)}>{children}</span>
}
