import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlantilla, updatePlantilla, deletePlantilla } from '@/lib/queries'

// GET /api/plantillas/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const { id } = await params
    const plantilla = await getPlantilla(Number(id))
    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })
    }
    return NextResponse.json(plantilla)
  } catch (err) {
    console.error('[plantillas/:id GET]', err)
    return NextResponse.json({ error: 'Error al obtener la plantilla.' }, { status: 500 })
  }
}

// PUT /api/plantillas/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const { id } = await params
    const { nombre, categoria, contenido } = await req.json() as {
      nombre: string
      categoria?: string
      contenido: string
    }
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
    }
    await updatePlantilla(Number(id), {
      nombre:    nombre.trim(),
      categoria: categoria?.trim() || undefined,
      contenido,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plantillas/:id PUT]', err)
    return NextResponse.json({ error: 'Error al actualizar la plantilla.' }, { status: 500 })
  }
}

// DELETE /api/plantillas/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const { id } = await params
    await deletePlantilla(Number(id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plantillas/:id DELETE]', err)
    return NextResponse.json({ error: 'Error al eliminar la plantilla.' }, { status: 500 })
  }
}
