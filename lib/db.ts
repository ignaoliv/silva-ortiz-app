import sql from 'mssql'

const CS = process.env.DATABASE_URL

// Reutilizar pool entre requests en producción
let _pool: sql.ConnectionPool | null = null

async function getPool(retries = 2): Promise<sql.ConnectionPool | null> {
  if (!CS) {
    console.warn('[DB] DATABASE_URL no está configurada.')
    return null
  }
  if (_pool?.connected) return _pool

  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`[DB] Intento ${i} de ${retries}...`)
      _pool = await new sql.ConnectionPool(CS).connect()
      console.log('[DB] Conexión exitosa.')
      return _pool
    } catch (err) {
      console.error(`[DB] Intento ${i} fallido:`, (err as Error).message)
      _pool = null
      if (i < retries) await new Promise(r => setTimeout(r, 1500))
    }
  }
  console.error('[DB] No se pudo conectar después de', retries, 'intentos.')
  return null
}

export async function checkDB(retries = 2): Promise<boolean> {
  return (await getPool(retries)) !== null
}

export async function query<T = Record<string, unknown>>(
  q: string
): Promise<T[] | null> {
  const pool = await getPool()
  if (!pool) return null
  try {
    const result = await pool.request().query(q)
    return result.recordset as T[]
  } catch (err) {
    console.error('[DB] Query error:', (err as Error).message)
    return null
  }
}
