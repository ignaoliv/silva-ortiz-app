import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateCaso } from '@/lib/queries'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  await updateCaso(parseInt(id), {
    caratula:             body.caratula,
    idCliente:            body.idCliente,
    idAbogadoResponsable: body.idAbogadoResponsable,
    nroInterno:           body.nroInterno,
    nroExpediente:        body.nroExpediente,
    idFuero:              body.idFuero,
    idJuzgado:            body.idJuzgado,
    idJurisdiccion:       body.idJurisdiccion,
    tipoProceso:          body.tipoProceso,
    fechaAlta:            body.fechaAlta,
    fechaNotif:           body.fechaNotif,
    fechaVencimiento:     body.fechaVencimiento,
    cerrado:              body.cerrado,
  })

  return NextResponse.json({ ok: true })
}
