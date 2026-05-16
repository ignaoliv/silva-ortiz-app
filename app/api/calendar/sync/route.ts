/**
 * POST /api/calendar/sync
 * Sincroniza audiencias y vencimientos próximos al calendario Microsoft del usuario.
 * Usa el access token delegado de la sesión (permisos Calendars.ReadWrite).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAudiencias, getCasos } from '@/lib/queries'
import {
  upsertEvent,
  audienciaToEvent,
  vencimientoToEvent,
} from '@/lib/msGraph'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const accessToken = session.accessToken
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Sin token de Microsoft Calendar. Cerrá sesión y volvé a entrar.' },
      { status: 403 }
    )
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // ── Audiencias futuras ──────────────────────────────────────────
  const audiencias = await getAudiencias()
  const audienciasFuturas = audiencias.filter(a => new Date(a.fecha) >= hoy)

  // ── Casos con vencimiento próximo (próximos 60 días) ───────────
  const casos = await getCasos()
  const en60  = new Date(hoy)
  en60.setDate(en60.getDate() + 60)
  const casosConVenc = casos.filter(c =>
    c.vencimiento &&
    new Date(c.vencimiento) >= hoy &&
    new Date(c.vencimiento) <= en60
  )

  const results = {
    audiencias: { created: 0, updated: 0, errors: 0 },
    vencimientos: { created: 0, updated: 0, errors: 0 },
  }

  // ── Sync audiencias ────────────────────────────────────────────
  for (const a of audienciasFuturas) {
    if (a.estado === 'Cancelada') continue
    const r = await upsertEvent(
      accessToken,
      `audiencia-${a.id}`,
      audienciaToEvent(a)
    )
    if (r.action === 'created') results.audiencias.created++
    else if (r.action === 'updated') results.audiencias.updated++
    else results.audiencias.errors++
  }

  // ── Sync vencimientos ──────────────────────────────────────────
  for (const c of casosConVenc) {
    const r = await upsertEvent(
      accessToken,
      `venc-caso-${c.id}`,
      vencimientoToEvent({
        idCaso:      c.id,
        caratula:    c.caratula,
        vencimiento: c.vencimiento!,
        responsable: c.responsableNombre,
      })
    )
    if (r.action === 'created') results.vencimientos.created++
    else if (r.action === 'updated') results.vencimientos.updated++
    else results.vencimientos.errors++
  }

  return NextResponse.json({
    ok: true,
    sincronizados: {
      audiencias:   audienciasFuturas.length,
      vencimientos: casosConVenc.length,
    },
    results,
  })
}

/** GET — devuelve si el usuario tiene permisos de calendario */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ conectado: false }, { status: 401 })
  }

  if (!session.accessToken) {
    return NextResponse.json({ conectado: false, motivo: 'sin_token' })
  }

  // Verificar que el token tiene permisos de Calendar
  const res = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id&$top=1', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })

  return NextResponse.json({
    conectado: res.ok,
    motivo:    res.ok ? null : `HTTP ${res.status}`,
  })
}
