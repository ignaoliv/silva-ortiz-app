import { NextResponse } from 'next/server'
import { getMovimientosByCaso } from '@/lib/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movs = await getMovimientosByCaso(parseInt(id))
  return NextResponse.json(movs)
}
