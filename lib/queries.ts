import { query, execute } from './db'

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
  ultimaActuacion: string | null
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
  urlDocumento: string | null
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
      ISNULL(vd.suma_reclamado, 0)          AS monto,
      (
        SELECT MAX(m.fecha_movimiento)
        FROM movimientos m
        WHERE m.id_caso = c.id_caso
          AND m.fecha_movimiento < '2027-01-01'
      ) AS fecha_ultima_actuacion
    FROM casos c
    LEFT JOIN clientes cl          ON c.id_cliente             = cl.id_cliente
    LEFT JOIN usuarios_estudio u   ON c.id_abogado_responsable = u.id_usuario
    LEFT JOIN fueros f             ON c.id_fuero               = f.id_fuero
    LEFT JOIN juzgados j           ON c.id_juzgado             = j.id_juzgado
    LEFT JOIN jurisdicciones ju    ON c.id_jurisdiccion        = ju.id_jurisdiccion
    LEFT JOIN estados_procesales ep ON c.id_estado_actual      = ep.id_estado
    LEFT JOIN vw_casos_dashboard vd ON c.id_caso              = vd.id_caso
    WHERE c.activo = 1
    ORDER BY fecha_ultima_actuacion DESC, c.id_caso ASC
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
    ultimaActuacion:   toDate(r.fecha_ultima_actuacion),
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
      ISNULL(u.nombre_completo, '—') AS usuario,
      m.url_documento                 AS url_documento
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
    tipo:         r.tipo_movimiento as string,
    titulo:       r.titulo as string,
    descripcion:  r.descripcion as string,
    usuario:      r.usuario as string,
    urlDocumento: r.url_documento as string | null,
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

// ── Notas, Instrucciones y Negociación ────────────────────────────────────────

export interface DBNotas {
  contenido:  string
  fechaMod:   string | null
}

export interface DBInstrucciones {
  contenido:  string
  fechaMod:   string | null
}

export interface DBNegociacion {
  montoMaxCliente: number | null
  montoOfrecido:   number | null
  contraoferta:    number | null
  estado:          string
  notas:           string | null
  fechaMod:        string | null
  historial:       DBOfertaHistorial[]
}

export interface DBOfertaHistorial {
  id:          number
  tipo:        string   // 'Oferta' | 'Contraoferta' | 'Acuerdo' | 'Rechazo'
  monto:       number | null
  descripcion: string | null
  fecha:       string
}

function esc(s: string) {
  return s.replace(/'/g, "''")
}

export async function getNotasByCaso(casoId: number): Promise<DBNotas> {
  const rows = await query<Record<string, unknown>>(`
    SELECT contenido, fecha_mod FROM caso_notas WHERE id_caso = ${casoId}
  `)
  const r = rows?.[0]
  return {
    contenido: (r?.contenido as string) ?? '',
    fechaMod:  r?.fecha_mod ? toDate(r.fecha_mod) : null,
  }
}

export async function upsertNotas(casoId: number, contenido: string): Promise<void> {
  await execute(`
    MERGE caso_notas AS t
    USING (SELECT ${casoId} AS id_caso) AS s ON t.id_caso = s.id_caso
    WHEN MATCHED THEN
      UPDATE SET contenido = N'${esc(contenido)}', fecha_mod = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (id_caso, contenido) VALUES (${casoId}, N'${esc(contenido)}');
  `)
}

export async function getInstruccionesByCaso(casoId: number): Promise<DBInstrucciones> {
  const rows = await query<Record<string, unknown>>(`
    SELECT contenido, fecha_mod FROM caso_instrucciones WHERE id_caso = ${casoId}
  `)
  const r = rows?.[0]
  return {
    contenido: (r?.contenido as string) ?? '',
    fechaMod:  r?.fecha_mod ? toDate(r.fecha_mod) : null,
  }
}

export async function upsertInstrucciones(casoId: number, contenido: string): Promise<void> {
  await execute(`
    MERGE caso_instrucciones AS t
    USING (SELECT ${casoId} AS id_caso) AS s ON t.id_caso = s.id_caso
    WHEN MATCHED THEN
      UPDATE SET contenido = N'${esc(contenido)}', fecha_mod = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (id_caso, contenido) VALUES (${casoId}, N'${esc(contenido)}');
  `)
}

export async function getNegociacionByCaso(casoId: number): Promise<DBNegociacion> {
  const [negRows, histRows] = await Promise.all([
    query<Record<string, unknown>>(`
      SELECT monto_max_cliente, monto_ofrecido, contraoferta, estado, notas, fecha_mod
      FROM caso_negociacion WHERE id_caso = ${casoId}
    `),
    query<Record<string, unknown>>(`
      SELECT id_historial, tipo, monto, descripcion, fecha
      FROM caso_negociacion_historial
      WHERE id_caso = ${casoId}
      ORDER BY fecha DESC
    `),
  ])
  const n = negRows?.[0]
  return {
    montoMaxCliente: n?.monto_max_cliente != null ? Number(n.monto_max_cliente) : null,
    montoOfrecido:   n?.monto_ofrecido   != null ? Number(n.monto_ofrecido)   : null,
    contraoferta:    n?.contraoferta     != null ? Number(n.contraoferta)     : null,
    estado:          (n?.estado as string) ?? 'Sin iniciar',
    notas:           (n?.notas as string) ?? null,
    fechaMod:        n?.fecha_mod ? toDate(n.fecha_mod) : null,
    historial: (histRows ?? []).map(r => ({
      id:          r.id_historial as number,
      tipo:        r.tipo as string,
      monto:       r.monto != null ? Number(r.monto) : null,
      descripcion: (r.descripcion as string) ?? null,
      fecha:       toDate(r.fecha) ?? '',
    })),
  }
}

export async function upsertNegociacion(
  casoId: number,
  data: {
    montoMaxCliente?: number | null
    montoOfrecido?:   number | null
    contraoferta?:    number | null
    estado?:          string
    notas?:           string | null
  }
): Promise<void> {
  const max  = data.montoMaxCliente != null ? data.montoMaxCliente : 'NULL'
  const ofr  = data.montoOfrecido   != null ? data.montoOfrecido   : 'NULL'
  const cnt  = data.contraoferta    != null ? data.contraoferta    : 'NULL'
  const est  = esc(data.estado ?? 'En curso')
  const not  = data.notas != null ? `N'${esc(data.notas)}'` : 'NULL'
  await execute(`
    MERGE caso_negociacion AS t
    USING (SELECT ${casoId} AS id_caso) AS s ON t.id_caso = s.id_caso
    WHEN MATCHED THEN
      UPDATE SET monto_max_cliente = ${max}, monto_ofrecido = ${ofr},
                 contraoferta = ${cnt}, estado = '${est}', notas = ${not},
                 fecha_mod = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (id_caso, monto_max_cliente, monto_ofrecido, contraoferta, estado, notas)
      VALUES (${casoId}, ${max}, ${ofr}, ${cnt}, '${est}', ${not});
  `)
}

export async function addOfertaHistorial(
  casoId: number,
  tipo: string,
  monto: number | null,
  descripcion: string | null
): Promise<void> {
  const m   = monto       != null ? monto       : 'NULL'
  const d   = descripcion != null ? `N'${esc(descripcion)}'` : 'NULL'
  const t   = esc(tipo)
  await execute(`
    INSERT INTO caso_negociacion_historial (id_caso, tipo, monto, descripcion)
    VALUES (${casoId}, '${t}', ${m}, ${d})
  `)
  // Actualizar el campo correspondiente en caso_negociacion también
  if (tipo === 'Oferta' && monto != null) {
    await execute(`
      MERGE caso_negociacion AS tbl
      USING (SELECT ${casoId} AS id_caso) AS s ON tbl.id_caso = s.id_caso
      WHEN MATCHED THEN UPDATE SET monto_ofrecido = ${monto}, fecha_mod = GETDATE()
      WHEN NOT MATCHED THEN INSERT (id_caso, monto_ofrecido, estado) VALUES (${casoId}, ${monto}, 'En curso');
    `)
  } else if (tipo === 'Contraoferta' && monto != null) {
    await execute(`
      MERGE caso_negociacion AS tbl
      USING (SELECT ${casoId} AS id_caso) AS s ON tbl.id_caso = s.id_caso
      WHEN MATCHED THEN UPDATE SET contraoferta = ${monto}, fecha_mod = GETDATE()
      WHEN NOT MATCHED THEN INSERT (id_caso, contraoferta, estado) VALUES (${casoId}, ${monto}, 'En curso');
    `)
  } else if (tipo === 'Acuerdo') {
    await execute(`
      MERGE caso_negociacion AS tbl
      USING (SELECT ${casoId} AS id_caso) AS s ON tbl.id_caso = s.id_caso
      WHEN MATCHED THEN UPDATE SET estado = 'Acuerdo', fecha_mod = GETDATE()
      WHEN NOT MATCHED THEN INSERT (id_caso, estado) VALUES (${casoId}, 'Acuerdo');
    `)
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
  resumenIa:   string | null
}

export interface DBPjnActuacion {
  id:            number
  idExpediente:  number
  fecha:         string
  tipo:          string
  detalle:       string
  fojas:         string
  urlBlob:       string | null
  textoExtraido: string | null
  resumenIa:     string | null
}

/** Devuelve el pjn_expediente vinculado a un caso (si existe). */
export async function getPjnExpedienteByCaso(casoId: number): Promise<DBPjnExpediente | null> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 1 id, nro_expediente, caratula, dependencia, situacion,
           ultima_act, id_caso, fecha_sync, resumen_ia
    FROM pjn_expedientes
    WHERE id_caso = ${casoId}
    ORDER BY fecha_sync DESC
  `)
  if (!rows || rows.length === 0) return null
  const r = rows[0]
  return {
    id:          r.id as number,
    nro:         r.nro_expediente as string,
    caratula:    r.caratula as string,
    dependencia: r.dependencia as string,
    situacion:   r.situacion as string,
    ultimaAct:   r.ultima_act ? String(r.ultima_act).split('T')[0] : null,
    idCaso:      r.id_caso as number | null,
    fechaSync:   String(r.fecha_sync).split('T')[0],
    resumenIa:   r.resumen_ia as string | null,
  }
}

export async function getPjnExpedientes(email: string): Promise<DBPjnExpediente[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, nro_expediente, caratula, dependencia, situacion,
           ultima_act, id_caso, fecha_sync, resumen_ia
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
    resumenIa:   r.resumen_ia as string | null,
  }))
}

export async function getPjnActuaciones(idExpediente: number): Promise<DBPjnActuacion[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, id_pjn_expediente, fecha, tipo, detalle, fojas, url_blob, texto_extraido, resumen_ia
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
    urlBlob:       r.url_blob       as string | null,
    textoExtraido: r.texto_extraido as string | null,
    resumenIa:     r.resumen_ia     as string | null,
  }))
}

export async function hasPjnCredentials(email: string): Promise<boolean> {
  const rows = await query<{ n: number }>(`
    SELECT COUNT(*) AS n FROM pjn_credenciales
    WHERE email_usuario = '${email.replace(/'/g, "''")}' AND pjn_password_enc IS NOT NULL
  `)
  return (rows?.[0]?.n ?? 0) > 0
}

export async function getPjnSyncLog(): Promise<{ fechaInicio: Date; estado: string; expedientes: number; actuacionesNew: number; error: string | null }[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 5 fecha_inicio, estado, expedientes, actuaciones_new, error
    FROM pjn_sync_log
    ORDER BY fecha_inicio DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    fechaInicio:    r.fecha_inicio as Date,
    estado:         r.estado as string,
    expedientes:    Number(r.expedientes),
    actuacionesNew: Number(r.actuaciones_new),
    error:          r.error as string | null,
  }))
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export interface DBFeedback {
  id:            number
  tipo:          string
  mensaje:       string
  pagina:        string | null
  emailUsuario:  string
  nombreUsuario: string | null
  leido:         boolean
  fechaCreacion: string
}

export async function insertFeedback(
  tipo: string,
  mensaje: string,
  pagina: string | null,
  email: string,
  nombre: string | null,
): Promise<void> {
  const esc = (s: string | null) => (s ?? '').replace(/'/g, "''")
  await execute(`
    INSERT INTO feedback (tipo, mensaje, pagina, email_usuario, nombre_usuario)
    VALUES (
      '${esc(tipo)}',
      '${esc(mensaje)}',
      ${pagina ? `'${esc(pagina)}'` : 'NULL'},
      '${esc(email)}',
      ${nombre ? `'${esc(nombre)}'` : 'NULL'}
    )
  `)
}

export async function getFeedback(): Promise<DBFeedback[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, tipo, mensaje, pagina, email_usuario, nombre_usuario, leido, fecha_creacion
    FROM feedback
    ORDER BY fecha_creacion DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:            Number(r.id),
    tipo:          String(r.tipo),
    mensaje:       String(r.mensaje),
    pagina:        r.pagina as string | null,
    emailUsuario:  String(r.email_usuario),
    nombreUsuario: r.nombre_usuario as string | null,
    leido:         Boolean(r.leido),
    fechaCreacion: String(r.fecha_creacion),
  }))
}

export async function markFeedbackLeido(id: number, leido: boolean): Promise<void> {
  await execute(`UPDATE feedback SET leido = ${leido ? 1 : 0} WHERE id = ${id}`)
}

export async function deleteFeedback(id: number): Promise<void> {
  await execute(`DELETE FROM feedback WHERE id = ${id}`)
}

export async function countFeedbackNoLeido(): Promise<number> {
  const rows = await query<Record<string, unknown>>(`
    SELECT COUNT(*) AS n FROM feedback WHERE leido = 0
  `)
  return Number(rows?.[0]?.n ?? 0)
}

// ── Plantillas ────────────────────────────────────────────────────────────────

export interface DBPlantilla {
  id: number
  nombre: string
  categoria: string | null
  contenido: string
  creadoPor: string | null
  creadoEn: Date
  actualizadoEn: Date
}

export async function getPlantillas(): Promise<DBPlantilla[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, nombre, categoria, contenido, creado_por, creado_en, actualizado_en
    FROM plantillas
    ORDER BY actualizado_en DESC
  `)
  if (!rows) return []
  return rows.map(r => ({
    id:            r.id as number,
    nombre:        r.nombre as string,
    categoria:     r.categoria as string | null,
    contenido:     r.contenido as string,
    creadoPor:     r.creado_por as string | null,
    creadoEn:      r.creado_en as Date,
    actualizadoEn: r.actualizado_en as Date,
  }))
}

export async function getPlantilla(id: number): Promise<DBPlantilla | null> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id, nombre, categoria, contenido, creado_por, creado_en, actualizado_en
    FROM plantillas
    WHERE id = ${id}
  `)
  const r = rows?.[0]
  if (!r) return null
  return {
    id:            r.id as number,
    nombre:        r.nombre as string,
    categoria:     r.categoria as string | null,
    contenido:     r.contenido as string,
    creadoPor:     r.creado_por as string | null,
    creadoEn:      r.creado_en as Date,
    actualizadoEn: r.actualizado_en as Date,
  }
}

export async function createPlantilla(data: {
  nombre: string
  categoria?: string
  contenido: string
  creadoPor: string
}): Promise<number> {
  const nombre    = esc(data.nombre)
  const categoria = data.categoria ? `N'${esc(data.categoria)}'` : 'NULL'
  const contenido = esc(data.contenido)
  const creadoPor = esc(data.creadoPor)
  const rows = await query<Record<string, unknown>>(`
    INSERT INTO plantillas (nombre, categoria, contenido, creado_por)
    OUTPUT INSERTED.id
    VALUES (N'${nombre}', ${categoria}, N'${contenido}', N'${creadoPor}')
  `)
  return rows?.[0]?.id as number
}

export async function updatePlantilla(
  id: number,
  data: { nombre: string; categoria?: string; contenido: string }
): Promise<void> {
  const nombre    = esc(data.nombre)
  const categoria = data.categoria ? `N'${esc(data.categoria)}'` : 'NULL'
  const contenido = esc(data.contenido)
  await execute(`
    UPDATE plantillas
    SET nombre = N'${nombre}', categoria = ${categoria}, contenido = N'${contenido}', actualizado_en = GETDATE()
    WHERE id = ${id}
  `)
}

export async function deletePlantilla(id: number): Promise<void> {
  await execute(`DELETE FROM plantillas WHERE id = ${id}`)
}

export async function getCasoParaDocumento(id: number): Promise<{
  caratula: string
  nroExpediente: string | null
  juzgado: string | null
  fuero: string | null
  cliente: string | null
  abogadoResponsable: string | null
} | null> {
  const rows = await query<Record<string, unknown>>(`
    SELECT
      c.caratula,
      c.nro_expediente,
      ISNULL(j.nombre, NULL)             AS juzgado,
      ISNULL(f.nombre, NULL)             AS fuero,
      ISNULL(cl.razon_social, NULL)      AS cliente,
      ISNULL(u.nombre_completo, NULL)    AS abogado_responsable
    FROM casos c
    LEFT JOIN juzgados j          ON c.id_juzgado             = j.id_juzgado
    LEFT JOIN fueros f            ON c.id_fuero               = f.id_fuero
    LEFT JOIN clientes cl         ON c.id_cliente             = cl.id_cliente
    LEFT JOIN usuarios_estudio u  ON c.id_abogado_responsable = u.id_usuario
    WHERE c.id_caso = ${id} AND c.activo = 1
  `)
  const r = rows?.[0]
  if (!r) return null
  return {
    caratula:           r.caratula as string,
    nroExpediente:      r.nro_expediente as string | null,
    juzgado:            r.juzgado as string | null,
    fuero:              r.fuero as string | null,
    cliente:            r.cliente as string | null,
    abogadoResponsable: r.abogado_responsable as string | null,
  }
}

export interface PjnUserStatus {
  conectado:      boolean
  sincronizando:  boolean          // hay un row con fecha_fin NULL (scraper corriendo)
  estadoUltimoSync: 'ok' | 'error' | null
  fechaUltimoSync:  string | null  // ISO
  horasDesdeSync:   number | null
  actuacionesNew:   number
}

// ── Catálogos (categorías, fueros, juzgados, jurisdicciones) ─────────────────

export interface DBCategoria { id: number; nombre: string }
export interface DBFuero { id: number; nombre: string }
export interface DBJuzgado { id: number; nombre: string }
export interface DBJurisdiccion { id: number; nombre: string }

export async function getCategorias(): Promise<DBCategoria[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id_categoria, nombre FROM categorias_caso
    ORDER BY nombre
  `)
  if (!rows) return []
  return rows.map(r => ({ id: r.id_categoria as number, nombre: r.nombre as string }))
}

export async function getFueros(): Promise<DBFuero[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id_fuero, nombre FROM fueros
    ORDER BY nombre
  `)
  if (!rows) return []
  return rows.map(r => ({ id: r.id_fuero as number, nombre: r.nombre as string }))
}

export async function getJuzgados(): Promise<DBJuzgado[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id_juzgado, nombre FROM juzgados
    ORDER BY nombre
  `)
  if (!rows) return []
  return rows.map(r => ({ id: r.id_juzgado as number, nombre: r.nombre as string }))
}

export async function getJurisdicciones(): Promise<DBJurisdiccion[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT id_jurisdiccion, nombre FROM jurisdicciones
    ORDER BY nombre
  `)
  if (!rows) return []
  return rows.map(r => ({ id: r.id_jurisdiccion as number, nombre: r.nombre as string }))
}

// ── Crear caso ───────────────────────────────────────────────────────────────

export async function createCaso(data: {
  caratula: string
  idCategoria: number
  idCliente: number
  idAbogadoResponsable: number
  nroInterno?: string
  nroExpediente?: string
  idFuero?: number
  idJuzgado?: number
  idJurisdiccion?: number
  tipoProceso?: string
  fechaAlta: string  // YYYY-MM-DD
  fechaVencimiento?: string
  usuarioCreacion: string
}): Promise<number> {
  const caratula      = esc(data.caratula)
  const usuarioCreac  = esc(data.usuarioCreacion)
  const nroInterno    = data.nroInterno    ? `N'${esc(data.nroInterno)}'`    : 'NULL'
  const nroExpediente = data.nroExpediente ? `N'${esc(data.nroExpediente)}'` : 'NULL'
  const tipoProceso   = esc(data.tipoProceso ?? 'Judicial')
  const idFuero       = data.idFuero        != null ? String(data.idFuero)        : 'NULL'
  const idJuzgado     = data.idJuzgado      != null ? String(data.idJuzgado)      : 'NULL'
  const idJurisdic    = data.idJurisdiccion != null ? String(data.idJurisdiccion) : 'NULL'
  const fechaVenc     = data.fechaVencimiento ? `'${esc(data.fechaVencimiento)}'` : 'NULL'

  const rows = await query<Record<string, unknown>>(`
    INSERT INTO casos (
      caratula, id_categoria, id_cliente, id_abogado_responsable,
      nro_interno, nro_expediente,
      id_fuero, id_juzgado, id_jurisdiccion,
      tipo_proceso, fecha_alta, fecha_proximo_vencimiento,
      activo, cerrado, fecha_creacion, usuario_creacion
    )
    OUTPUT INSERTED.id_caso
    VALUES (
      N'${caratula}', ${data.idCategoria}, ${data.idCliente}, ${data.idAbogadoResponsable},
      ${nroInterno}, ${nroExpediente},
      ${idFuero}, ${idJuzgado}, ${idJurisdic},
      N'${tipoProceso}', '${esc(data.fechaAlta)}', ${fechaVenc},
      1, 0, GETDATE(), '${usuarioCreac}'
    )
  `)
  return rows?.[0]?.id_caso as number
}

// ── Crear movimiento ─────────────────────────────────────────────────────────

export async function createMovimiento(data: {
  casoId: number
  tipo: string
  titulo: string
  descripcion: string
  fecha: string  // YYYY-MM-DD
  urlDocumento?: string | null
  idUsuarioRegistro?: number | null
}): Promise<number> {
  const tipo        = esc(data.tipo)
  const titulo      = esc(data.titulo)
  const descripcion = esc(data.descripcion)
  const urlDoc      = data.urlDocumento ? `N'${esc(data.urlDocumento)}'` : 'NULL'
  const idUsuario   = data.idUsuarioRegistro != null ? String(data.idUsuarioRegistro) : 'NULL'

  const rows = await query<Record<string, unknown>>(`
    INSERT INTO movimientos (
      id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion,
      url_documento, id_usuario_registro, fecha_carga
    )
    OUTPUT INSERTED.id_movimiento
    VALUES (
      ${data.casoId}, '${esc(data.fecha)}', N'${tipo}', N'${titulo}', N'${descripcion}',
      ${urlDoc}, ${idUsuario}, GETDATE()
    )
  `)
  return rows?.[0]?.id_movimiento as number
}

export async function getUsuarioIdByEmail(email: string): Promise<number | null> {
  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 1 id_usuario FROM usuarios_estudio
    WHERE email = '${esc(email)}' AND activo = 1
  `)
  const r = rows?.[0]
  return r ? (r.id_usuario as number) : null
}

export async function getPjnUserStatus(email: string): Promise<PjnUserStatus> {
  const conectado = await hasPjnCredentials(email)

  const rows = await query<Record<string, unknown>>(`
    SELECT TOP 1 fecha_inicio, fecha_fin, estado, actuaciones_new
    FROM pjn_sync_log
    WHERE email_usuario = '${email.replace(/'/g, "''")}'
    ORDER BY fecha_inicio DESC
  `)
  const row = rows?.[0]
  if (!row) {
    return { conectado, sincronizando: false, estadoUltimoSync: null, fechaUltimoSync: null, horasDesdeSync: null, actuacionesNew: 0 }
  }
  const fechaFinDate    = row.fecha_fin ? (row.fecha_fin as Date) : null
  const fechaInicioDate = row.fecha_inicio as Date
  const sincronizando   = !fechaFinDate
  const horasDesdeSync  = fechaFinDate
    ? (Date.now() - fechaFinDate.getTime()) / 3600000
    : null
  return {
    conectado,
    sincronizando,
    estadoUltimoSync: row.estado as 'ok' | 'error' | null,
    fechaUltimoSync:  (fechaFinDate ?? fechaInicioDate).toISOString(),
    horasDesdeSync,
    actuacionesNew:   Number(row.actuaciones_new ?? 0),
  }
}
