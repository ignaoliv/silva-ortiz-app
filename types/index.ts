export interface Usuario {
  id: number
  nombre: string
  tipo: string
  color: string
  iniciales: string
  email: string
}

export interface Cliente {
  id: number
  nombre: string
  tipo: 'Persona física' | 'Persona jurídica'
  cuit: string
  email: string
  tel: string
  casos: number
  color: string
}

export type EstadoCaso = 'Activo' | 'En trámite' | 'Archivado' | 'Cerrado'
export type EstadoAudiencia = 'Programada' | 'Realizada' | 'Cancelada'
export type ModalidadAudiencia = 'Presencial' | 'Virtual'

export interface Caso {
  id: number
  nro: string
  exp: string
  caratula: string
  cliente_id: number
  estado: EstadoCaso
  responsable_id: number
  fuero: string
  jurisdiccion: string
  juzgado: string
  tipo: string
  fecha_alta: string
  fecha_notif: string | null
  vencimiento: string | null
  monto: number
  cerrado: boolean
}

export interface Audiencia {
  id: number
  caso_id: number
  caratula: string
  tipo: string
  fecha: string
  hora: string
  lugar: string
  modalidad: ModalidadAudiencia
  estado: EstadoAudiencia
  abogado: string
}

export interface Movimiento {
  id: number
  tipo: string
  titulo: string
  desc: string
  user: string
  color: 'green' | 'blue' | 'orange'
  fecha: string
}

export type SortDir = 1 | -1
export type SortCol = 'nro' | 'caratula' | 'cliente' | 'estado' | 'responsable' | 'vencimiento'
