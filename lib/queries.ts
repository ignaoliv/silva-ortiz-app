import { query } from './db'

// ── Tipos que reflejan exactamente la DB ──────────────────────────────

export interface DBCaso {
  id: number
  nro: string
  exp: string
  caratula: string
  clienteId: number
  clienteNombre: string
  responsableId: number
  responsableNombre: string
  fuero: string
  juzgado: string
  jurisdiccion: string
  tipo: string
  estado: string          // estado_procesal real de la DB
  esFinal: boolean
  fechaAlta: string
  fechaNotif: string | null
  vencimiento: string | null
  monto: number
  cerrado: boolean
}

export interface DBCliente {
  id: number
  nombre: string
  tipo: string
  cuit: string
  email: string
  tel: string
  casos: number
}

export interface DBAudiencia {
  id: number
  casoId: number
  caratula: string
  tipo: string
  fecha: string
  hora: string
  lugar: string
  modalidad: 'Presencial' | 'Virtual'
  estado: string
  abogado: string
}

export interface DBMovimiento {
  id: number
  casoId: number
  fecha: string
  tipo: string
  titulo: string
  descripcion: string
  usuario: string
}

export interface DBUsuario {
  id: number
  nombre: string
  tipo: string
  email: string
}

export interface DBHonorario {
  id: number
  concepto: string
  fecha: string
  monto: number
  estado: string
}

export interface DBKPIs {
  total: number
  activos: number
  en7dias: number
  audSemana: number
}

// ── Helpers ────────────────────────────────────────────────────────────

function toDate(val: unknown): string | null {
  if (!val) return null
  const d = val instanceof Date ? val : new Date(val as string)
  return d.toISOString().split('T')[0]
}

// ── Queries ────────────────────────────────────────────────────────────

export async function getCasos(): Promise<DBCaso[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT
      c.id_caso,
      c.nro_interno,
      c.nro_expediente,
      c.caratula,
      c.id_cliente,
      ISNULL(cl.razon_social, '—')         AS cliente_nombre,
      c.id_abogado_responsable,
      ISNULL(u.nombre_completo, '—')        AS responsable_nombre,
      ISNULL(f.nombre, '—')                 AS fuero,
      ISNULL(j.nombre, '—')                 AS juzgado,
      ISNULL(ju.nombre, '—')                AS jurisdiccion,
      ISNULL(c.tipo_proceso, '—')           AS tipo_proceso,
      ISNULL(ep.nombre, 'Sin estado')       AS estado_procesal,
      ISNULL(ep.es_final, 0)               AS es_final,
      c.fecha_alta,
      c.fecha_notificacion,
      c.fecha_proximo_vencimiento,
      c.cerrado,
      ISNULL(vd.suma_reclamado, 0)          AS monto
    FROM casos c
    LEFT JOIN clientes cl          ON c.id_cliente             = cl.id_cliente
    LEFT JOIN usuarios_estudio u   ON c.id_abogado_responsable = u.id_usuario
    LEFT JOIN fueros f             ON c.id_fuero               = f.id_fuero
    LEFT JOIN juzgados j           ON c.id_juzgado             = j.id_juzgado
    LEFT JOIN jurisdicciones ju    ON c.id_jurisdiccion        = ju.id_jurisdiccion
    LEFT JOIN estados_procesales ep ON c.id_estado_actual      = ep.id_estado
    LEFT JOIN vw_casos_dashboard vd ON c.id_caso              = vd.id_caso
    WHERE c.activo = 1
    ORDER BY c.fecha_proximo_vencimiento ASC, c.id_caso ASC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:                r.id_caso as number,
    nro:               (r.nro_interno as string) ?? '—',
    exp:               (r.nro_expediente as string) ?? '—',
    caratula:          (r.caratula as string) ?? '—',
    clienteId:         r.id_cliente as number,
    clienteNombre:     r.cliente_nombre as string,
    responsableId:     r.id_abogado_responsable as number,
    responsableNombre: r.responsable_nombre as string,
    fuero:             r.fuero as string,
    juzgado:           r.juzgado as string,
    jurisdiccion:      r.jurisdiccion as string,
    tipo:              r.tipo_proceso as string,
    estado:            r.cerrado ? 'Cerrado' : (r.estado_procesal as string),
    esFinal:           Boolean(r.es_final) || Boolean(r.cerrado),
    fechaAlta:         toDate(r.fecha_alta) ?? '',
    fechaNotif:        toDate(r.fecha_notificacion),
    vencimiento:       toDate(r.fecha_proximo_vencimiento),
    monto:             Number(r.monto) || 0,
    cerrado:           Boolean(r.cerrado),
  }))
}

export async function getClientes(): Promise<DBCliente[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT
      cl.id_cliente,
      ISNULL(cl.razon_social, '—') AS razon_social,
      ISNULL(cl.tipo_cliente, '—') AS tipo_cliente,
      ISNULL(cl.cuit_cuil, '—')    AS cuit_cuil,
      ISNULL(cl.email, '—')        AS email,
      ISNULL(cl.telefono, '—')     AS telefono,
      COUNT(c.id_caso)             AS total_casos
    FROM clientes cl
    LEFT JOIN casos c ON cl.id_cliente = c.id_cliente AND c.activo = 1
    WHERE cl.activo = 1
    GROUP BY cl.id_cliente, cl.razon_social, cl.tipo_cliente, cl.cuit_cuil, cl.email, cl.telefono
    ORDER BY cl.razon_social
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:     r.id_cliente as number,
    nombre: r.razon_social as string,
    tipo:   r.tipo_cliente as string,
    cuit:   r.cuit_cuil as string,
    email:  r.email as string,
    tel:    r.telefono as string,
    casos:  Number(r.total_casos),
  }))
}

export async function getAudiencias(): Promise<DBAudiencia[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 200
      a.id_audiencia,
      a.id_caso,
      c.caratula,
      ISNULL(a.tipo_audiencia, '—')           AS tipo_audiencia,
      a.fecha_hora,
      ISNULL(a.lugar, '—')                    AS lugar,
      ISNULL(a.modalidad, 'Presencial')        AS modalidad,
      ISNULL(a.estado, 'Programada')           AS estado,
      ISNULL(u.nombre_completo, '—')           AS abogado
    FROM audiencias a
    JOIN casos c ON a.id_caso = c.id_caso
    LEFT JOIN usuarios_estudio u ON a.id_abogado_asistente = u.id_usuario
    WHERE c.activo = 1
    ORDER BY a.fecha_hora ASC
  `)
  if (!rows) return []
  return rows.map(r => {
    const dt = r.fecha_hora instanceof Date ? r.fecha_hora : new Date(r.fecha_hora as string)
    const fecha = dt.toISOString().split('T')[0]
    const hora  = dt.toTimeString().slice(0, 5)
    return {
      id:        r.id_audiencia as number,
      casoId:    r.id_caso as number,
      caratula:  r.caratula as string,
      tipo:      r.tipo_audiencia as string,
      fecha,
      hora,
      lugar:     r.lugar as string,
      modalidad: (r.modalidad as string).includes('Virtual') ? 'Virtual' : 'Presencial',
      estado:    r.estado as string,
      abogado:   r.abogado as string,
    }
  })
}

export async function getMovimientosByCaso(casoId: number): Promise<DBMovimiento[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 50
      m.id_movimiento,
      m.id_caso,
      m.fecha_movimiento,
      ISNULL(m.tipo_movimiento, '—')  AS tipo_movimiento,
      ISNULL(m.titulo, '—')           AS titulo,
      ISNULL(m.descripcion, '')       AS descripcion,
      ISNULL(u.nombre_completo, '—') AS usuario
    FROM movimientos m
    LEFT JOIN usuarios_estudio u ON m.id_usuario_registro = u.id_usuario
    WHERE m.id_caso = ${casoId}
    ORDER BY m.fecha_movimiento DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:          r.id_movimiento as number,
    casoId:      r.id_caso as number,
    fecha:       toDate(r.fecha_movimiento) ?? '',
    tipo:        r.tipo_movimiento as string,
    titulo:      r.titulo as string,
    descripcion: r.descripcion as string,
    usuario:     r.usuario as string,
  }))
}

export async function getHonorariosByCaso(casoId: number): Promise<DBHonorario[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 20
      h.id_honorario,
      ISNULL(h.concepto, 'Honorario')  AS concepto,
      h.fecha_factura,
      ISNULL(h.monto_total, 0)          AS monto,
      ISNULL(h.estado_pago, 'Pendiente') AS estado_pago
    FROM honorarios h
    WHERE h.id_caso = ${casoId}
    ORDER BY h.fecha_factura DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:       r.id_honorario as number,
    concepto: r.concepto as string,
    fecha:    toDate(r.fecha_factura) ?? '',
    monto:    Number(r.monto),
    estado:   r.estado_pago as string,
  }))
}

export async function getUsuarios(): Promise<DBUsuario[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id_usuario, nombre_completo, tipo_usuario, email
    FROM usuarios_estudio
    WHERE activo = 1
    ORDER BY tipo_usuario, nombre_completo
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:     r.id_usuario as number,
    nombre: r.nombre_completo as string,
    tipo:   r.tipo_usuario as string,
    email:  r.email as string,
  }))
}

export async function getKPIs(): Promise<DBKPIs> {
  const hoy = new Date().toISOString().split('T')[0]
  const en7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const rows = await query<Record<string, unknown>>(`
    SELECT
      (SELECT COUNT(*) FROM casos WHERE activo = 1)                                         AS total,
      (SELECT COUNT(*) FROM casos c
         JOIN estados_procesales ep ON c.id_estado_actual = ep.id_estado
         WHERE c.activo = 1 AND c.cerrado = 0 AND ep.es_final = 0)                         AS activos,
      (SELECT COUNT(*) FROM casos WHERE activo = 1 AND cerrado = 0
         AND fecha_proximo_vencimiento BETWEEN '${hoy}' AND '${en7}')                      AS en7dias,
      (SELECT COUNT(*) FROM audiencias a
         JOIN casos c ON a.id_caso = c.id_caso
         WHERE c.activo = 1
           AND CAST(a.fecha_hora AS DATE) BETWEEN '${hoy}' AND '${en7}')                   AS aud_semana
  `)
  const r = rows?.[0]
  return {
    total:     Number(r?.total)     || 0,
    activos:   Number(r?.activos)   || 0,
    en7dias:   Number(r?.en7dias)   || 0,
    audSemana: Number(r?.aud_semana) || 0,
  }
}

// ── PJN ───────────────────────────────────────────────────────────────────────

export interface DBPjnExpediente {
  id:          number
  nro:         string
  caratula:    string
  dependencia: string
  situacion:   string
  ultimaAct:   string | null
  idCaso:      number | null
  fechaSync:   string
}

export interface DBPjnActuacion {
  id:          number
  idExpediente: number
  fecha:       string
  tipo:        string
  detalle:     string
  fojas:       string
  urlBlob:     string | null
}

export async function getPjnExpedientes(email: string): Promise<DBPjnExpediente[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, nro_expediente, caratula, dependencia, situacion,
           ultima_act, id_caso, fecha_sync
    FROM pjn_expedientes
    WHERE email_usuario = '${email.replace(/'/g, "''")}'
    ORDER BY fecha_sync DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:          r.id as number,
    nro:         r.nro_expediente as string,
    caratula:    r.caratula as string,
    dependencia: r.dependencia as string,
    situacion:   r.situacion as string,
    ultimaAct:   r.ultima_act ? String(r.ultima_act).split('T')[0] : null,
    idCaso:      r.id_caso as number | null,
    fechaSync:   String(r.fecha_sync).split('T')[0],
  }))
}

export async function getPjnActuaciones(idExpediente: number): Promise<DBPjnActuacion[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, id_pjn_expediente, fecha, tipo, detalle, fojas, url_blob
    FROM pjn_actuaciones
    WHERE id_pjn_expediente = ${idExpediente}
    ORDER BY fecha DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:           r.id as number,
    idExpediente: r.id_pjn_expediente as number,
    fecha:        r.fecha instanceof Date ? r.fecha.toISOString().split('T')[0] : String(r.fecha).split('T')[0],
    tipo:         r.tipo as string,
    detalle:      r.detalle as string,
    fojas:        r.fojas as string,
    urlBlob:      r.url_blob as string | null,
  }))
}

export async function hasPjnCredentials(email: string): Promise<boolean> {
  const rows = await query<{ n: number }>(`
    SELECT COUNT(*) AS n FROM pjn_credenciales
    WHERE email_usuario = '${email.replace(/'/g, "''")}' AND pjn_password_enc IS NOT NULL
  `)
  return (rows?.[0]?.n ?? 0) > 0
}

export async function getPjnSyncLog(): Promise<{ fechaInicio: string; estado: string; expedientes: number; actuacionesNew: number; error: string | null }[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 5 fecha_inicio, estado, expedientes, actuaciones_new, error
    FROM pjn_sync_log
    ORDER BY fecha_inicio DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    fechaInicio:   String(r.fecha_inicio).split('T')[0],
    estado:        r.estado as string,
    expedientes:   Number(r.expedientes),
    actuacionesNew: Number(r.actuaciones_new),
    error:         r.error as string | null,
  }))
}
