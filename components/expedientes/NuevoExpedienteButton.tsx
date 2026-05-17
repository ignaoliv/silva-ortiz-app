'use client'
import { useState } from 'react'
import NuevoExpedienteModal from './NuevoExpedienteModal'
import type {
  DBCliente, DBUsuario, DBCategoria, DBFuero, DBJuzgado, DBJurisdiccion,
} from '@/lib/queries'

interface Props {
  clientes: DBCliente[]
  usuarios: DBUsuario[]
  categorias: DBCategoria[]
  fueros: DBFuero[]
  juzgados: DBJuzgado[]
  jurisdicciones: DBJurisdiccion[]
}

export default function NuevoExpedienteButton(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-xs font-semibold bg-so-red hover:opacity-80 text-white transition-opacity rounded"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        + Nuevo expediente
      </button>
      {open && (
        <NuevoExpedienteModal
          onClose={() => setOpen(false)}
          {...props}
        />
      )}
    </>
  )
}
