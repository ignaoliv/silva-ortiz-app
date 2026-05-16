import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlantillas, createPlantilla } from '@/lib/queries'

// GET /api/plantillas — lista todas las plantillas
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const plantillas = await getPlantillas()
    return NextResponse.json(plantillas)
  } catch (err) {
    console.error('[plantillas GET]', err)
    return NextResponse.json({ error: 'Error al obtener plantillas.' }, { status: 500 })
  }
}

// POST /api/plantillas — crear nueva plantilla
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    const { nombre, categoria, contenido } = await req.json() as {
      nombre: string
      categoria?: string
      contenido: string
    }
    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
    }
    if (!contenido?.trim()) {
      return NextResponse.json({ error: 'El contenido es obligatorio.' }, { status: 400 })
    }
    const id = await createPlantilla({
      nombre:    nombre.trim(),
      categoria: categoria?.trim() || undefined,
      contenido,
      creadoPor: session.user.email,
    })
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    console.error('[plantillas POST]', err)
    return NextResponse.json({ error: 'Error al crear la plantilla.' }, { status: 500 })
  }
}
