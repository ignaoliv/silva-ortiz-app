import sql from 'mssql'

const CONNECTION_STRING = process.env.DATABASE_URL

/**
 * Intenta conectarse a la base de datos SQL Server.
 * Reintenta `retries` veces antes de rendirse.
 * Devuelve true si la conexión fue exitosa, false en caso contrario.
 */
export async function checkDB(retries = 2): Promise<boolean> {
  if (!CONNECTION_STRING) {
    console.warn('[DB] DATABASE_URL no está configurada.')
    return false
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Intento ${attempt} de ${retries}...`)
      const pool = new sql.ConnectionPool(CONNECTION_STRING)
      await pool.connect()
      await pool.close()
      console.log('[DB] Conexión exitosa.')
      return true
    } catch (err) {
      console.error(`[DB] Intento ${attempt} fallido:`, err)
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }
  }

  console.error(`[DB] No se pudo conectar después de ${retries} intentos.`)
  return false
}

/**
 * Ejecuta una query y devuelve los resultados.
 * Devuelve null si no hay conexión o la query falla.
 */
export async function query<T = Record<string, unknown>>(
  q: string,
  retries = 2
): Promise<T[] | null> {
  if (!CONNECTION_STRING) return null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const pool = await sql.connect(CONNECTION_STRING)
      const result = await pool.request().query(q)
      return result.recordset as T[]
    } catch (err) {
      console.error(`[DB] Query intento ${attempt} fallido:`, err)
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500))
    }
  }
  return null
}
