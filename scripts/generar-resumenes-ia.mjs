/**
 * Genera resúmenes IA para las últimas 3 actuaciones con texto de cada
 * expediente PJN, más un resumen general del caso.
 * Guarda los resultados en pjn_actuaciones.resumen_ia y pjn_expedientes.resumen_ia
 *
 * node scripts/generar-resumenes-ia.mjs
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const sql       = require('mssql')
const Anthropic = require('@anthropic-ai/sdk').default

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf-8')
  const vars = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) vars[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return vars
}
const env     = loadEnv()
const pool    = await new sql.ConnectionPool(env.DATABASE_URL).connect()
const claude  = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

async function dbQuery(q) {
  return (await pool.request().query(q)).recordset
}

function esc(s, max = 99999) {
  return String(s || '').replace(/'/g, "''").substring(0, max)
}

// ── Generar resumen con Claude (no streaming) ─────────────────────
async function resumir(prompt) {
  const msg = await claude.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 300,
    messages:   [{ role: 'user', content: prompt }],
  })
  return msg.content[0]?.text?.trim() ?? ''
}

// ── Resumen de una actuación individual ───────────────────────────
async function resumirActuacion(act) {
  const texto = act.texto_extraido.substring(0, 8000)
  return resumir(`Sos un asistente jurídico argentino. Resumí esta actuación judicial en 2-3 oraciones concisas en español, destacando tipo de documento, partes involucradas, y cualquier plazo o acción requerida.

Actuación: "${act.detalle?.substring(0, 100)}"
Fecha: ${act.fecha}
Contenido:
${texto}

Respondé solo con el resumen, sin introducción.`)
}

// ── Resumen general del expediente ───────────────────────────────
async function resumirExpediente(expediente, actuaciones) {
  const bloques = actuaciones.map((a, i) =>
    `[${i + 1}] ${a.fecha} — ${a.detalle?.substring(0, 80)}\n${a.texto_extraido?.substring(0, 2000) ?? ''}`
  ).join('\n\n---\n\n')

  return resumir(`Sos un asistente jurídico argentino. Analizá las últimas actuaciones del expediente judicial y hacé un resumen ejecutivo del estado actual del caso en 4-5 oraciones. Incluí: tipo de causa, partes, estado procesal, última novedad importante, y si hay acciones o plazos pendientes.

Expediente: ${expediente.nro_expediente}
Carátula: ${expediente.caratula}

Últimas actuaciones:
${bloques.substring(0, 12000)}

Respondé solo con el resumen ejecutivo, sin introducción.`)
}

// ── Main ──────────────────────────────────────────────────────────
const expedientes = await dbQuery(`
  SELECT id, nro_expediente, caratula FROM pjn_expedientes ORDER BY id DESC
`)

for (const exp of expedientes) {
  console.log(`\n📁 ${exp.nro_expediente} — ${exp.caratula?.substring(0, 60)}`)

  // Últimas 3 actuaciones con texto (ordenadas por fecha desc)
  const acts = await dbQuery(`
    SELECT TOP 3 id, fecha, detalle, texto_extraido, resumen_ia
    FROM pjn_actuaciones
    WHERE id_pjn_expediente = ${exp.id}
      AND texto_extraido IS NOT NULL
    ORDER BY fecha DESC, id DESC
  `)

  if (acts.length === 0) {
    console.log('  ⚠️  Sin actuaciones con texto — saltando')
    continue
  }

  // ── Resúmenes individuales ────────────────────────────────────
  for (const act of acts) {
    if (act.resumen_ia) {
      console.log(`  ↩️  id=${act.id} ya tiene resumen`)
      continue
    }
    process.stdout.write(`  📄 id=${act.id} ${act.fecha} — generando resumen...`)
    try {
      const resumen = await resumirActuacion(act)
      await dbQuery(`UPDATE pjn_actuaciones SET resumen_ia='${esc(resumen)}' WHERE id=${act.id}`)
      console.log(` ✅ (${resumen.length} chars)`)
    } catch (e) {
      console.log(` ❌ ${e.message.substring(0, 60)}`)
    }
  }

  // ── Resumen general del expediente ───────────────────────────
  const expRow = await dbQuery(`SELECT resumen_ia FROM pjn_expedientes WHERE id=${exp.id}`)
  if (expRow[0]?.resumen_ia) {
    console.log('  ↩️  Expediente ya tiene resumen general')
  } else {
    // Tomar hasta las últimas 5 actuaciones con texto para el resumen general
    const actsParaResumen = await dbQuery(`
      SELECT TOP 5 id, fecha, detalle, texto_extraido
      FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${exp.id}
        AND texto_extraido IS NOT NULL
      ORDER BY fecha DESC, id DESC
    `)
    process.stdout.write(`  🗂️  Generando resumen general del expediente...`)
    try {
      const resumen = await resumirExpediente(exp, actsParaResumen)
      await dbQuery(`UPDATE pjn_expedientes SET resumen_ia='${esc(resumen)}' WHERE id=${exp.id}`)
      console.log(` ✅ (${resumen.length} chars)`)
      console.log(`\n  💬 "${resumen.substring(0, 250)}..."`)
    } catch (e) {
      console.log(` ❌ ${e.message.substring(0, 60)}`)
    }
  }
}

await pool.close()
console.log('\n✅ Listo')
