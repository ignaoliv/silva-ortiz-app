import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMovimientosByCaso, createMovimiento, getUsuarioIdByEmail } from '@/lib/queries'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const movs = await getMovimientosByCaso(parseInt(id))
  return NextResponse.json(movs)
}

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const { id } = await params
    const casoId = parseInt(id)
    if (!casoId) {
      return NextResponse.json({ error: 'ID de caso inválido.' }, { status: 400 })
    }

    const body = await req.json() as {
      tipo?: string
      titulo?: string
      descripcion?: string
      fecha?: string
      urlDocumento?: string
    }

    if (!body.titulo?.trim())      return NextResponse.json({ error: 'El título es obligatorio.' },      { status: 400 })
    if (!body.descripcion?.trim()) return NextResponse.json({ error: 'La descripción es obligatoria.' }, { status: 400 })
    if (!body.fecha)               return NextResponse.json({ error: 'La fecha es obligatoria.' },        { status: 400 })

    const idUsuario = await getUsuarioIdByEmail(session.user.email)

    const newId = await createMovimiento({
      casoId,
      tipo:              (body.tipo ?? 'Otro').slice(0, 100),
      titulo:            body.titulo.trim().slice(0, 250),
      descripcion:       body.descripcion.trim(),
      fecha:             body.fecha,
      urlDocumento:      body.urlDocumento?.trim() ? body.urlDocumento.trim().slice(0, 1000) : null,
      idUsuarioRegistro: idUsuario,
    })

    return NextResponse.json({ id: newId }, { status: 201 })
  } catch (err) {
    console.error('[movimientos POST]', err)
    return NextResponse.json({ error: 'Error al crear el movimiento.' }, { status: 500 })
  }
}
