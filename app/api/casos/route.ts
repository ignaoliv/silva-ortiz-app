import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCaso } from '@/lib/queries'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const body = await req.json() as {
      caratula?: string
      idCategoria?: number
      idCliente?: number
      idAbogadoResponsable?: number
      nroInterno?: string
      nroExpediente?: string
      idFuero?: number
      idJuzgado?: number
      idJurisdiccion?: number
      tipoProceso?: string
      fechaAlta?: string
      fechaVencimiento?: string
    }

    if (!body.caratula?.trim()) {
      return NextResponse.json({ error: 'La carátula es obligatoria.' }, { status: 400 })
    }
    if (!body.idCategoria) {
      return NextResponse.json({ error: 'La categoría es obligatoria.' }, { status: 400 })
    }
    if (!body.idCliente) {
      return NextResponse.json({ error: 'El cliente es obligatorio.' }, { status: 400 })
    }
    if (!body.idAbogadoResponsable) {
      return NextResponse.json({ error: 'El abogado responsable es obligatorio.' }, { status: 400 })
    }
    if (!body.fechaAlta) {
      return NextResponse.json({ error: 'La fecha de alta es obligatoria.' }, { status: 400 })
    }

    const id = await createCaso({
      caratula:             body.caratula.trim().slice(0, 500),
      idCategoria:          body.idCategoria,
      idCliente:            body.idCliente,
      idAbogadoResponsable: body.idAbogadoResponsable,
      nroInterno:           body.nroInterno?.trim().slice(0, 50) || undefined,
      nroExpediente:        body.nroExpediente?.trim().slice(0, 100) || undefined,
      idFuero:              body.idFuero || undefined,
      idJuzgado:            body.idJuzgado || undefined,
      idJurisdiccion:       body.idJurisdiccion || undefined,
      tipoProceso:          body.tipoProceso?.trim().slice(0, 50) || 'Judicial',
      fechaAlta:            body.fechaAlta,
      fechaVencimiento:     body.fechaVencimiento || undefined,
      usuarioCreacion:      session.user.email,
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('[casos POST]', err)
    return NextResponse.json({ error: 'Error al crear el expediente.' }, { status: 500 })
  }
}
