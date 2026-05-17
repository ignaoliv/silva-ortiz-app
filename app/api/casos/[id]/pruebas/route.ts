import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPruebasByCaso } from '@/lib/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const pruebas = await getPruebasByCaso(parseInt(id))
  return NextResponse.json(pruebas)
}
