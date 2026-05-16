/**
 * Migración: agregar texto_extraido a pjn_actuaciones
 * Corre con: node scripts/run-migration-texto-extraido.mjs
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
      if (idx < 0) continue
      vars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
    return vars
  } catch { return {} }
}

const env = loadEnv()
const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL

if (!DATABASE_URL) { console.error('❌ DATABASE_URL no configurado'); process.exit(1) }

const migSQL = readFileSync(join(__dir, 'migrations/add-texto-extraido.sql'), 'utf-8')

const pool = await new sql.ConnectionPool(DATABASE_URL).connect()
try {
  await pool.request().query(migSQL)
  console.log('✅ Columna texto_extraido agregada a pjn_actuaciones')
} catch (e) {
  console.error('❌ Error:', e.message)
} finally {
  await pool.close()
}
