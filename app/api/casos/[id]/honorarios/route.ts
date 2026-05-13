import { NextResponse } from 'next/server'
import { getHonorariosByCaso } from '@/lib/queries'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hon = await getHonorariosByCaso(parseInt(id))
  return NextResponse.json(hon)
}
