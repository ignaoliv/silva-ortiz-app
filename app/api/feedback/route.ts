import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { insertFeedback, getFeedback, markFeedbackLeido, deleteFeedback } from '@/lib/queries'

const ADMIN_EMAILS = ['general@silvaortiz.com.ar']
function isAdmin(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

// POST /api/feedback — cualquier usuario logueado puede enviar
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const { tipo, mensaje, pagina } = await req.json() as {
      tipo:    string
      mensaje: string
      pagina:  string
    }

    const tiposValidos = ['error', 'sugerencia', 'consulta', 'otro']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
    }
    if (!mensaje?.trim()) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 })
    }
    if (mensaje.trim().length > 2000) {
      return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 })
    }

    await insertFeedback(
      tipo,
      mensaje.trim(),
      pagina || null,
      session.user.email,
      session.user.name ?? null,
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback POST]', err)
    return NextResponse.json({ error: 'Error al guardar el feedback.' }, { status: 500 })
  }
}

// GET /api/feedback — solo admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }
    const data = await getFeedback()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[feedback GET]', err)
    return NextResponse.json({ error: 'Error al obtener feedback.' }, { status: 500 })
  }
}

// PATCH /api/feedback — marcar leído (admin)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }
    const { id, leido } = await req.json() as { id: number; leido: boolean }
    await markFeedbackLeido(id, leido)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback PATCH]', err)
    return NextResponse.json({ error: 'Error al actualizar.' }, { status: 500 })
  }
}

// DELETE /api/feedback — borrar (admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }
    const { id } = await req.json() as { id: number }
    await deleteFeedback(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[feedback DELETE]', err)
    return NextResponse.json({ error: 'Error al eliminar.' }, { status: 500 })
  }
}
