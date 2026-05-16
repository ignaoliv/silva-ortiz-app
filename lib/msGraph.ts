/**
 * Microsoft Graph API — helper para calendario
 * Usa el access token de la sesión (delegado, no application)
 */

const GRAPH = 'https://graph.microsoft.com/v1.0'
const CAL_CATEGORY = 'Silva Ortiz' // categoría de color para identificar eventos

// ── Tipos Graph ────────────────────────────────────────────────────

export interface GraphEvent {
  id?:       string
  subject:   string
  body?:     { contentType: 'text' | 'HTML'; content: string }
  start:     { dateTime: string; timeZone: string }
  end:       { dateTime: string; timeZone: string }
  location?: { displayName: string }
  isAllDay?: boolean
  categories?: string[]
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

// ── Buscar evento por extensión (nuestro ID interno) ──────────────
// Usamos una SingleValueExtendedProperty para trackear qué eventos creamos nosotros

const EXT_ID_PROP = 'String {00020329-0000-0000-C000-000000000046} Name SilvaOrtizId'

export async function findEventBySilvaId(
  accessToken: string,
  silvaId:     string
): Promise<string | null> {
  const filter = encodeURIComponent(
    `singleValueExtendedProperties/Any(ep: ep/id eq '${EXT_ID_PROP}' and ep/value eq '${silvaId}')`
  )
  const res = await graphFetch(
    accessToken,
    `/me/events?$filter=${filter}&$select=id&$top=1` +
    `&$expand=singleValueExtendedProperties($filter=id eq '${EXT_ID_PROP}')`,
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.value?.[0]?.id ?? null
}

// ── Crear evento ──────────────────────────────────────────────────

export async function createEvent(
  accessToken: string,
  event:       GraphEvent
): Promise<string | null> {
  const res = await graphFetch(accessToken, '/me/events', {
    method: 'POST',
    body:   JSON.stringify({ ...event, categories: [CAL_CATEGORY] }),
  })
  if (!res.ok) {
    console.error('[msGraph] createEvent error', res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data.id ?? null
}

// ── Actualizar evento ─────────────────────────────────────────────

export async function updateEvent(
  accessToken: string,
  eventId:     string,
  patch:       Partial<GraphEvent>
): Promise<boolean> {
  const res = await graphFetch(accessToken, `/me/events/${eventId}`, {
    method: 'PATCH',
    body:   JSON.stringify(patch),
  })
  return res.ok
}

// ── Borrar evento ─────────────────────────────────────────────────

export async function deleteEvent(
  accessToken: string,
  eventId:     string
): Promise<boolean> {
  const res = await graphFetch(accessToken, `/me/events/${eventId}`, {
    method: 'DELETE',
  })
  return res.status === 204
}

// ── Upsert: crea o actualiza según si ya existe ────────────────────

export async function upsertEvent(
  accessToken: string,
  silvaId:     string,   // ej: "audiencia-42" o "venc-caso-17"
  event:       GraphEvent
): Promise<{ action: 'created' | 'updated' | 'error'; eventId?: string }> {
  const eventWithExt: GraphEvent = {
    ...event,
    categories: [CAL_CATEGORY],
    singleValueExtendedProperties: [
      { id: EXT_ID_PROP, value: silvaId },
    ],
  }

  const existingId = await findEventBySilvaId(accessToken, silvaId)

  if (existingId) {
    const ok = await updateEvent(accessToken, existingId, eventWithExt)
    return ok
      ? { action: 'updated', eventId: existingId }
      : { action: 'error' }
  }

  const newId = await createEvent(accessToken, eventWithExt)
  return newId
    ? { action: 'created', eventId: newId }
    : { action: 'error' }
}

// ── Construir eventos desde datos del app ─────────────────────────

const TZ = 'America/Argentina/Buenos_Aires'

/** Audiencia → GraphEvent */
export function audienciaToEvent(a: {
  id:       number
  caratula: string
  tipo:     string
  fecha:    string    // 'YYYY-MM-DD'
  hora:     string    // 'HH:MM'
  lugar:    string
  modalidad: string
  abogado:  string
}): GraphEvent {
  const startDT = `${a.fecha}T${a.hora.padEnd(5, '0')}:00`
  // Duración por defecto: 1 hora
  const endHour  = (parseInt(a.hora.slice(0, 2)) + 1).toString().padStart(2, '0')
  const endDT    = `${a.fecha}T${endHour}:${a.hora.slice(3, 5)}:00`

  return {
    subject: `Audiencia — ${a.caratula}`,
    body: {
      contentType: 'HTML',
      content: `
        <b>Tipo:</b> ${a.tipo}<br>
        <b>Expediente:</b> ${a.caratula}<br>
        <b>Modalidad:</b> ${a.modalidad}<br>
        <b>Abogado:</b> ${a.abogado}<br>
        <b>Lugar:</b> ${a.lugar}
      `.trim(),
    },
    start:    { dateTime: startDT, timeZone: TZ },
    end:      { dateTime: endDT,   timeZone: TZ },
    location: { displayName: a.lugar },
  }
}

/** Vencimiento de caso → GraphEvent (todo el día) */
export function vencimientoToEvent(c: {
  idCaso:    number
  caratula:  string
  vencimiento: string   // 'YYYY-MM-DD'
  responsable?: string
}): GraphEvent {
  return {
    subject:  `Vencimiento — ${c.caratula}`,
    body: {
      contentType: 'HTML',
      content: `
        <b>Expediente:</b> ${c.caratula}<br>
        ${c.responsable ? `<b>Responsable:</b> ${c.responsable}` : ''}
      `.trim(),
    },
    start:    { dateTime: `${c.vencimiento}T09:00:00`, timeZone: TZ },
    end:      { dateTime: `${c.vencimiento}T09:30:00`, timeZone: TZ },
    isAllDay: false,
  }
}
