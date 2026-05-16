/**
 * Test extracción de texto de PDFs ya guardados en Azure Blob
 * node scripts/test-pdf-extraction.mjs
 */

import { readFileSync, writeFileSync, readdirSync, rmSync, mkdtempSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import sql from 'mssql'

const __dir = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')
async function pdfParse(buffer) {
  const parser = new PDFParse()
  return parser.parse(buffer)
}
const { createWorker } = require('tesseract.js')

const OCR_TEXT_MIN = 80
const PDFTOPPM     = '/opt/homebrew/bin/pdftoppm'  // instalado con brew install poppler

// ── Env ───────────────────────────────────────────────────────────
function loadEnv() {
  const raw = readFileSync(`${__dir}/../.env.local`, 'utf-8')
  const vars = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) vars[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return vars
}
const env = loadEnv()

// ── DB ────────────────────────────────────────────────────────────
let pool
async function getPool() {
  if (pool?.connected) return pool
  pool = await new sql.ConnectionPool(env.DATABASE_URL).connect()
  return pool
}
async function dbQuery(q) {
  const p = await getPool()
  return (await p.request().query(q)).recordset
}

// ── OCR: pdftoppm → imagen → tesseract ───────────────────────────
async function ocr(buffer) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'pjn-ocr-'))
  const pdfPath = join(tmpDir, 'doc.pdf')
  writeFileSync(pdfPath, buffer)

  try {
    // Convertir PDF a imágenes PNG (máx 3 páginas para el test, 200 dpi)
    execSync(`${PDFTOPPM} -png -r 200 -l 3 "${pdfPath}" "${join(tmpDir, 'page')}"`, { stdio: 'pipe' })

    const pages = readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort()
    if (pages.length === 0) { console.log('    ⚠️  pdftoppm no generó imágenes'); return null }

    const worker = await createWorker('spa')
    const texts  = []

    for (const page of pages) {
      const imgPath = join(tmpDir, page)
      const { data: { text } } = await worker.recognize(imgPath)
      const t = text.trim()
      if (t) texts.push(t)
      console.log(`    📄 ${page}: ${t.length} chars`)
    }

    await worker.terminate()
    return texts.join('\n\n') || null
  } catch (e) {
    console.log(`    ❌ OCR error: ${e.message.substring(0, 100)}`)
    return null
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function extraerTextoPDF(buffer) {
  const data  = await pdfParse(buffer).catch(() => ({ text: '' }))
  const texto = data.text?.trim() ?? ''
  if (texto.length >= OCR_TEXT_MIN) return { texto, metodo: 'digital' }
  console.log(`    🔍 Escaneado (${texto.length} chars) → OCR...`)
  const textoOcr = await ocr(buffer)
  return { texto: textoOcr, metodo: 'ocr' }
}

// ── Main ──────────────────────────────────────────────────────────
const rows = await dbQuery(`
  SELECT TOP 5 id, detalle, url_blob
  FROM pjn_actuaciones
  WHERE url_blob IS NOT NULL AND texto_extraido IS NULL
  ORDER BY id DESC
`)

console.log(`\n📋 ${rows.length} actuaciones con PDF sin texto extraído\n`)

if (rows.length === 0) {
  // Si todos ya tienen texto, mostrar los que tienen
  const conTexto = await dbQuery(`
    SELECT TOP 5 id, detalle, texto_extraido
    FROM pjn_actuaciones
    WHERE texto_extraido IS NOT NULL
    ORDER BY id DESC
  `)
  console.log(`✅ Ya hay ${conTexto.length} actuaciones con texto. Muestra:`)
  conTexto.forEach(r => {
    console.log(`\n  id=${r.id} | ${r.detalle?.substring(0,60)}`)
    console.log(`  Texto: "${r.texto_extraido?.substring(0,200)}..."`)
  })
  process.exit(0)
}

let ok = 0, fail = 0
for (const row of rows) {
  console.log(`\n── id=${row.id} | ${row.detalle?.substring(0, 60)}`)
  try {
    // Bajar el PDF desde Azure Blob (SAS URL)
    const res = await fetch(row.url_blob)
    if (!res.ok) { console.log(`  ❌ HTTP ${res.status}`); fail++; continue }
    const buffer = Buffer.from(await res.arrayBuffer())
    console.log(`  ⬇️  ${buffer.length} bytes`)

    const { texto, metodo } = await extraerTextoPDF(buffer)
    if (!texto) { console.log(`  ⚠️  Sin texto`); fail++; continue }

    console.log(`  ✅ [${metodo}] ${texto.length} caracteres`)
    console.log(`  📖 "${texto.substring(0, 300).replace(/\n/g, ' ')}..."`)

    // Guardar en DB
    const textoEsc = texto.replace(/'/g, "''").substring(0, 99999)
    await dbQuery(`UPDATE pjn_actuaciones SET texto_extraido='${textoEsc}' WHERE id=${row.id}`)
    console.log(`  💾 Guardado en DB`)
    ok++
  } catch (e) {
    console.log(`  ❌ Error: ${e.message.substring(0, 100)}`)
    fail++
  }
}

console.log(`\n✅ ${ok} OK  ❌ ${fail} errores`)
await pool?.close()
