/**
 * Microsoft Graph API — helper para calendario
 * Usa el access token de la sesión (delegado, no application).
 * Todos los eventos se escriben en un calendario dedicado "Silva Ortiz"
 * — nunca se toca el calendario principal del usuario.
 */

const GRAPH       = 'https://graph.microsoft.com/v1.0'
const CAL_NAME    = 'Silva Ortiz'
const EXT_ID_PROP = 'String {00020329-0000-0000-C000-000000000046} Name SilvaOrtizId'

// ── Tipos Graph ────────────────────────────────────────────────────

export interface GraphEvent {
  id?:       string
  subject:   string
  body?:     { contentType: 'text' | 'HTML'; content: string }
  start:     { dateTime: string; timeZone: string }
  end:       { dateTime: string; timeZone: string }
  location?: { displayName: string }
  isAllDay?: boolean
  singleValueExtendedProperties?: Array<{ id: string; value: string }>
}

// ── Helper fetch ──────────────────────────────────────────────────

async function graphFetch(
  accessToken: string,
  path:        string,
  options:     RequestInit = {}
): Promise<Response> {
  return fetch(`${GRAPH}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

// ── Calendario dedicado "Silva Ortiz" ─────────────────────────────
// Busca el calendario por nombre; si no existe, lo crea.
// El código NUNCA escribe en ningún otro calendario.

export async function getOrCreateCalendar(accessToken: string): Promise<string | null> {
  // Listar calendarios del usuario
  const res = await graphFetch(accessToken, '/me/calendars?$select=id,name&$top=50')
  if (!res.ok) {
    console.error('[msGraph] Error listando calendarios:', res.status)
    return null
  }
  const data = await res.json()
  const existing = (data.value as Array<{ id: string; name: string }>)
    .find(c => c.name === CAL_NAME)

  if (existing) return existing.id

  // Crear calendario dedicado
  const create = await graphFetch(accessToken, '/me/calendars', {
    method: 'POST',
    body:   JSON.stringify({ name: CAL_NAME }),
  })
  if (!create.ok) {
    console.error('[msGraph] Error creando calendario:', create.status, await create.text())
    return null
  }
  const created = await create.json()
  console.log('[msGraph] Calendario "Silva Ortiz" creado:', created.id)
  return created.id
}

// ── Buscar evento por extensión dentro del calendario dedicado ────

async function findEventBySilvaId(
  accessToken:  string,
  calendarId:   string,
  silvaId:      string
): Promise<string | null> {
  const filter = encodeURIComponent(
    `singleValueExtendedProperties/Any(ep: ep/id eq '${EXT_ID_PROP}' and ep/value eq '${silvaId}')`
  )
  const res = await graphFetch(
    accessToken,
    `/me/calendars/${calendarId}/events?$filter=${filter}&$select=id&$top=1` +
    `&$expand=singleValueExtendedProperties($filter=id eq '${EXT_ID_PROP}')`,
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.value?.[0]?.id ?? null
}

// ── Crear evento en el calendario dedicado ────────────────────────

async function createEvent(
  accessToken: string,
  calendarId:  string,
  event:       GraphEvent
): Promise<string | null> {
  const res = await graphFetch(
    accessToken,
    `/me/calendars/${calendarId}/events`,
    { method: 'POST', body: JSON.stringify(event) }
  )
  if (!res.ok) {
    console.error('[msGraph] createEvent error', res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data.id ?? null
}

// ── Actualizar evento ─────────────────────────────────────────────

async function updateEvent(
  accessToken: string,
  eventId:     string,
  patch:       Partial<GraphEvent>
): Promise<boolean> {
  // PATCH sobre /me/events/{id} funciona independientemente del calendario
  const res = await graphFetch(accessToken, `/me/events/${eventId}`, {
    method: 'PATCH',
    body:   JSON.stringify(patch),
  })
  return res.ok
}

// ── Upsert: crea o actualiza, siempre dentro del calendario dedicado

export async function upsertEvent(
  accessToken: string,
  calendarId:  string,
  silvaId:     string,
  event:       GraphEvent
): Promise<{ action: 'created' | 'updated' | 'error'; eventId?: string }> {
  const eventWithExt: GraphEvent = {
    ...event,
    singleValueExtendedProperties: [
      { id: EXT_ID_PROP, value: silvaId },
    ],
  }

  const existingId = await findEventBySilvaId(accessToken, calendarId, silvaId)

  if (existingId) {
    const ok = await updateEvent(accessToken, existingId, eventWithExt)
    return ok
      ? { action: 'updated', eventId: existingId }
      : { action: 'error' }
  }

  const newId = await createEvent(accessToken, calendarId, eventWithExt)
  return newId
    ? { action: 'created', eventId: newId }
    : { action: 'error' }
}

// ── Construir eventos desde datos del app ─────────────────────────

const TZ = 'America/Argentina/Buenos_Aires'

/** Audiencia → GraphEvent */
export function audienciaToEvent(a: {
  id:        number
  caratula:  string
  tipo:      string
  fecha:     string   // 'YYYY-MM-DD'
  hora:      string   // 'HH:MM'
  lugar:     string
  modalidad: string
  abogado:   string
}): GraphEvent {
  const startDT = `${a.fecha}T${a.hora.padEnd(5, '0')}:00`
  const endHour = (parseInt(a.hora.slice(0, 2)) + 1).toString().padStart(2, '0')
  const endDT   = `${a.fecha}T${endHour}:${a.hora.slice(3, 5)}:00`

  return {
    subject: `Audiencia — ${a.caratula}`,
    body: {
      contentType: 'HTML',
      content: [
        `<b>Tipo:</b> ${a.tipo}`,
        `<b>Expediente:</b> ${a.caratula}`,
        `<b>Modalidad:</b> ${a.modalidad}`,
        `<b>Abogado:</b> ${a.abogado}`,
        `<b>Lugar:</b> ${a.lugar}`,
      ].join('<br>'),
    },
    start:    { dateTime: startDT, timeZone: TZ },
    end:      { dateTime: endDT,   timeZone: TZ },
    location: { displayName: a.lugar },
  }
}

/** Vencimiento de caso → GraphEvent */
export function vencimientoToEvent(c: {
  idCaso:       number
  caratula:     string
  vencimiento:  string  // 'YYYY-MM-DD'
  responsable?: string
}): GraphEvent {
  return {
    subject: `Vencimiento — ${c.caratula}`,
    body: {
      contentType: 'HTML',
      content: [
        `<b>Expediente:</b> ${c.caratula}`,
        c.responsable ? `<b>Responsable:</b> ${c.responsable}` : '',
      ].filter(Boolean).join('<br>'),
    },
    start: { dateTime: `${c.vencimiento}T09:00:00`, timeZone: TZ },
    end:   { dateTime: `${c.vencimiento}T09:30:00`, timeZone: TZ },
  }
}
