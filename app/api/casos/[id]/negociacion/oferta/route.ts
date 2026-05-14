import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { addOfertaHistorial } from '@/lib/queries'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { tipo, monto, descripcion } = await req.json()
  if (!tipo) return NextResponse.json({ error: 'tipo requerido' }, { status: 400 })
  await addOfertaHistorial(parseInt(id), tipo, monto ?? null, descripcion ?? null)
  return NextResponse.json({ ok: true })
}
