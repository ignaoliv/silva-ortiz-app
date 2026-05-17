import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientes, getUsuarios, getFueros, getJuzgados, getJurisdicciones, getCategorias } from '@/lib/queries'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [clientes, usuarios, fueros, juzgados, jurisdicciones, categorias] = await Promise.all([
    getClientes(),
    getUsuarios(),
    getFueros(),
    getJuzgados(),
    getJurisdicciones(),
    getCategorias(),
  ])

  return NextResponse.json({ clientes, usuarios, fueros, juzgados, jurisdicciones, categorias })
}
