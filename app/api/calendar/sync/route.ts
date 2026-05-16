/**
 * POST /api/calendar/sync
 * Sincroniza audiencias y vencimientos al calendario dedicado "Silva Ortiz"
 * en Microsoft Calendar del usuario. NUNCA toca el calendario principal.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAudiencias, getCasos } from '@/lib/queries'
import {
  getOrCreateCalendar,
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

  // Obtener (o crear) el calendario dedicado "Silva Ortiz"
  const calendarId = await getOrCreateCalendar(accessToken)
  if (!calendarId) {
    return NextResponse.json(
      { error: 'No se pudo acceder al calendario. Verificá los permisos.' },
      { status: 500 }
    )
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Audiencias futuras
  const audiencias        = await getAudiencias()
  const audienciasFuturas = audiencias.filter(a => new Date(a.fecha) >= hoy)

  // Casos con vencimiento en los próximos 60 días
  const casos   = await getCasos()
  const en60    = new Date(hoy)
  en60.setDate(en60.getDate() + 60)
  const casosConVenc = casos.filter(c =>
    c.vencimiento &&
    new Date(c.vencimiento) >= hoy &&
    new Date(c.vencimiento) <= en60
  )

  const results = {
    audiencias:   { created: 0, updated: 0, errors: 0 },
    vencimientos: { created: 0, updated: 0, errors: 0 },
  }

  // Sync audiencias
  for (const a of audienciasFuturas) {
    if (a.estado === 'Cancelada') continue
    const r = await upsertEvent(accessToken, calendarId, `audiencia-${a.id}`, audienciaToEvent(a))
    if      (r.action === 'created') results.audiencias.created++
    else if (r.action === 'updated') results.audiencias.updated++
    else                             results.audiencias.errors++
  }

  // Sync vencimientos
  for (const c of casosConVenc) {
    const r = await upsertEvent(
      accessToken, calendarId,
      `venc-caso-${c.id}`,
      vencimientoToEvent({ idCaso: c.id, caratula: c.caratula, vencimiento: c.vencimiento!, responsable: c.responsableNombre })
    )
    if      (r.action === 'created') results.vencimientos.created++
    else if (r.action === 'updated') results.vencimientos.updated++
    else                             results.vencimientos.errors++
  }

  return NextResponse.json({
    ok: true,
    calendarId,
    sincronizados: {
      audiencias:   audienciasFuturas.length,
      vencimientos: casosConVenc.length,
    },
    results,
  })
}

/** GET — verifica si el usuario tiene permisos de calendario */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ conectado: false }, { status: 401 })
  }
  if (!session.accessToken) {
    return NextResponse.json({ conectado: false, motivo: 'sin_token' })
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id&$top=1', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  return NextResponse.json({
    conectado: res.ok,
    motivo:    res.ok ? null : `HTTP ${res.status}`,
  })
}
