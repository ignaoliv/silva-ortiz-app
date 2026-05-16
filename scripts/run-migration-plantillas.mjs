/**
 * Migración: crear tabla plantillas
 * Corre con: node scripts/run-migration-plantillas.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import sql from 'mssql'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const env = readFileSync(join(__dir, '../.env.local'), 'utf-8')
    const vars = {}
    for (const line of env.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const k = trimmed.slice(0, idx).trim()
      const v = trimmed.slice(idx + 1).trim()
      vars[k] = v
    }
    return vars
  } catch { return {} }
}

const env = loadEnv()
const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no encontrado en .env.local')
  process.exit(1)
}

const migrationSql = readFileSync(
  join(__dir, 'migrations/create-plantillas.sql'),
  'utf-8'
)

console.log('Conectando a SQL Server...')

let pool
try {
  pool = await new sql.ConnectionPool(DATABASE_URL).connect()
  console.log('Conexión exitosa.')

  console.log('Ejecutando migración...')
  await pool.request().query(migrationSql)
  console.log('✅ Migración completada: tabla plantillas creada (o ya existía).')
} catch (err) {
  console.error('❌ Error durante la migración:', err.message)
  process.exit(1)
} finally {
  if (pool) await pool.close()
}
