/**
 * PJN Scraper — Silva Ortiz
 * node scripts/pjn-scraper.mjs
 */

import { chromium } from 'playwright'
import sql from 'mssql'
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdtempSync, promises as fsPromises } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import crypto from 'crypto'
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'
import { createRequire as makeRequire } from 'module'

const require = makeRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')
const pdfParse = (buffer) => new PDFParse().parse(buffer)
const { createWorker } = require('tesseract.js')

const PDFTOPPM    = '/opt/homebrew/bin/pdftoppm'
const OCR_TEXT_MIN = 80  // si pdf-parse da menos de esto, asumimos que es escaneo

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Env ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const env = readFileSync(join(__dir, '../.env.local'), 'utf-8')
    const vars = {}
    for (const line of env.split('\n')) {
      const [k, ...v] = line.split('=')
      if (k && v.length) vars[k.trim()] = v.join('=').trim()
    }
    return vars
  } catch { return {} }
}

const env                     = loadEnv()
const DATABASE_URL            = process.env.DATABASE_URL            || env.DATABASE_URL
const ENCRYPTION_KEY          = process.env.ENCRYPTION_KEY          || env.ENCRYPTION_KEY
const AZURE_STORAGE_CONN_STR  = process.env.AZURE_STORAGE_CONN_STR  || env.AZURE_STORAGE_CONN_STR
const BLOB_CONTAINER          = 'pjn-documentos'

if (!DATABASE_URL)   { console.error('❌ DATABASE_URL no configurado'); process.exit(1) }
if (!ENCRYPTION_KEY) { console.error('❌ ENCRYPTION_KEY no configurado'); process.exit(1) }
if (!AZURE_STORAGE_CONN_STR) { console.warn('⚠️  AZURE_STORAGE_CONN_STR no configurado — documentos no se subirán') }

// ── Azure Blob ────────────────────────────────────────────────────
let blobContainer = null
async function getBlobContainer() {
  if (blobContainer) return blobContainer
  if (!AZURE_STORAGE_CONN_STR) return null
  const client   = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONN_STR)
  blobContainer  = client.getContainerClient(BLOB_CONTAINER)
  // Sin acceso público — usamos SAS URLs
  await blobContainer.createIfNotExists()
  return blobContainer
}

async function subirPDF(buffer, nombre) {
  const container = await getBlobContainer()
  if (!container) return null
  const blobName  = nombre.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blob      = container.getBlockBlobClient(blobName)
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: 'application/pdf' } })
  // Generar SAS URL válida por 2 años
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 2)
  const sasUrl = await blob.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn:   expiry,
  })
  return sasUrl
}

// ── Crypto ────────────────────────────────────────────────────────
function decrypt(data) {
  const key       = Buffer.from(ENCRYPTION_KEY, 'hex')
  const [ivHex, tagHex, encHex] = data.split(':')
  const iv        = Buffer.from(ivHex, 'hex')
  const tag       = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher  = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

// ── DB ────────────────────────────────────────────────────────────
let pool
async function getPool() {
  if (pool?.connected) return pool
  pool = await new sql.ConnectionPool(DATABASE_URL).connect()
  return pool
}
async function dbQuery(q) {
  const p = await getPool()
  return (await p.request().query(q)).recordset
}

// ── Helpers ───────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function esc(s, max = 499) {
  return (String(s || '')).replace(/'/g, "''").substring(0, max)
}

// ── OCR: pdftoppm → imagen → tesseract ───────────────────────────
async function ocr(buffer) {
  const tmpDir  = mkdtempSync(join(tmpdir(), 'pjn-ocr-'))
  const pdfPath = join(tmpDir, 'doc.pdf')
  writeFileSync(pdfPath, buffer)
  try {
    execSync(`${PDFTOPPM} -png -r 200 "${pdfPath}" "${join(tmpDir, 'page')}"`, { stdio: 'pipe' })
    const pages  = readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort()
    if (pages.length === 0) return null
    const worker = await createWorker('spa')
    const texts  = []
    for (const page of pages) {
      const { data: { text } } = await worker.recognize(join(tmpDir, page))
      if (text.trim()) texts.push(text.trim())
    }
    await worker.terminate()
    const resultado = texts.join('\n\n')
    console.log(`          🔍 OCR: ${resultado.length} chars (${pages.length} págs)`)
    return resultado || null
  } catch (e) {
    console.warn(`          ⚠️  OCR falló: ${e.message.substring(0, 80)}`)
    return null
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ── Extraer texto de un buffer PDF (digital → OCR como fallback) ──
async function extraerTextoPDF(buffer) {
  try {
    // 1. Intentar extracción directa (PDFs digitales)
    const data  = await pdfParse(buffer)
    const texto = data.text?.trim() ?? ''
    if (texto.length >= OCR_TEXT_MIN) {
      console.log(`          📝 Texto extraído (digital): ${texto.length} caracteres`)
      return texto
    }

    // 2. Poco o ningún texto → es un escaneo → OCR
    console.log(`          🔍 PDF escaneado detectado (${texto.length} chars) — iniciando OCR...`)
    return await ocr(buffer)
  } catch (e) {
    // pdf-parse falló → intentar OCR directamente
    console.warn(`          ⚠️  pdf-parse falló: ${e.message.substring(0, 60)} — intentando OCR...`)
    return await ocr(buffer)
  }
}

// ── Descargar PDF via href directo con fetch (cookies de sesión) ──
// Retorna { blobUrl, textoExtraido }
async function descargarPorHref(page, href, nroExp, fecha, idx) {
  try {
    const url = href.startsWith('http') ? href : `https://scw.pjn.gov.ar${href}`

    // fetch() dentro del contexto de la page tiene las cookies de sesión
    const arr = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include' })
      if (!r.ok) return null
      return Array.from(new Uint8Array(await r.arrayBuffer()))
    }, url)

    if (!arr || arr.length < 500) {
      console.log(`          ⚠️  Respuesta vacía o chica (${arr?.length ?? 0} bytes)`)
      return { blobUrl: null, textoExtraido: null }
    }

    const pdfBuffer = Buffer.from(arr)
    console.log(`          📡 PDF via fetch (${pdfBuffer.length} bytes)`)

    const [blobUrl, textoExtraido] = await Promise.all([
      subirPDF(pdfBuffer, `${nroExp.replace(/\s/g, '_')}_${fecha.replace(/\//g, '-')}_${idx}.pdf`),
      extraerTextoPDF(pdfBuffer),
    ])

    if (blobUrl) console.log(`          ☁️  Subido: ${blobUrl.split('?')[0]}`)
    return { blobUrl, textoExtraido }

  } catch (e) {
    console.warn(`          ⚠️  Error descarga: ${e.message.substring(0, 80)}`)
    return { blobUrl: null, textoExtraido: null }
  }
}

// ── Extraer actuaciones desde expediente.seam ────────────────────
// Tabla: id="expediente:action-table"
// Columnas: 0=botón-descarga | 1=OFICINA | 2=FECHA | 3=TIPO | 4=DESCRIPCION | 5=FOJAS
async function extraerActuacionesExpediente(page, nroExp, idPjnExp) {
  await page.waitForSelector('[id="expediente:action-table"]', { timeout: 15000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

  // ── Optimización: si la última actuación ya está en DB, saltear ─
  const latestOnPage = await page.evaluate(() => {
    function celda(td) {
      if (!td) return ''
      const span = td.querySelector('.font-color-black')
      return (span ? span.textContent : td.textContent).trim()
    }
    const firstRow = document.querySelector('[id="expediente:action-table"] tbody tr')
    if (!firstRow) return null
    const cells = [...firstRow.querySelectorAll('td')]
    return { fecha: celda(cells[2]), descripcion: celda(cells[4]) }
  })

  if (latestOnPage?.fecha && idPjnExp) {
    const latestISO = parseDate(latestOnPage.fecha)
    const inDB = await dbQuery(`
      SELECT TOP 1 fecha, detalle FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
      ORDER BY fecha DESC, id DESC
    `)
    if (inDB.length > 0) {
      const raw       = inDB[0].fecha
      const dbFecha   = raw instanceof Date ? raw.toISOString().split('T')[0] : String(raw).split('T')[0]
      const dbDetalle = (inDB[0].detalle || '').substring(0, 60)
      const pageDesc  = latestOnPage.descripcion.substring(0, 60)
      if (dbFecha === latestISO && dbDetalle === pageDesc) {
        console.log(`      ⏭️  Sin cambios desde ${latestOnPage.fecha}, saltando`)
        return []
      }
    }
  }

  // ── Leer filas de la tabla actual ───────────────────────────────
  function leerFilasActuaciones() {
    return page.evaluate(() => {
      function celda(td) {
        if (!td) return ''
        // Preferir span con clase real; si no, excluir sr-only y unir el resto
        const real = td.querySelector('.font-color-black')
        if (real) return real.textContent.trim()
        return [...td.querySelectorAll('span:not(.sr-only)')]
          .map(s => s.textContent.trim()).filter(Boolean).join(' ')
          || td.textContent.replace(/[A-Za-záéíóúñÁÉÍÓÚÑ]+:\s*/g, '').trim()
      }
      const tbl = document.getElementById('expediente:action-table')
      if (!tbl) return []
      return [...tbl.querySelectorAll('tbody tr')].map(tr => {
        const cells  = [...tr.querySelectorAll('td')]
        if (cells.length < 5) return null
        const dlLink = tr.querySelector('a[href*="download=true"]')
        const dlHref = dlLink?.getAttribute('href') || null
        const fecha  = celda(cells[2])
        if (!fecha || !/\d{2}\/\d{2}\/\d{4}/.test(fecha)) return null
        return {
          fecha,
          tipo:        celda(cells[3]).substring(0, 99),
          descripcion: celda(cells[4]).substring(0, 999),
          fojas:       celda(cells[5]).substring(0, 49),
          dlHref,
        }
      }).filter(Boolean)
    })
  }

  // ── Paginación: navegar por número de página ─────────────────────
  // La paginación usa links numerados (<a>2</a>, <a>3</a>, etc.) dentro de divPagesAct
  const items = []
  let actPag = 1
  while (true) {
    const batch = await leerFilasActuaciones()
    items.push(...batch)
    // Buscar link con el número de la siguiente página
    const nextPageLocator = page.locator(`[id*="divPagesAct"] li:not(.active) a`).filter({ hasText: String(actPag + 1) })
    const hasNext = await nextPageLocator.count() > 0
    if (!hasNext || actPag >= 30) break
    await nextPageLocator.first().click()
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(800)
    actPag++
  }

  console.log(`      📊 ${items.length} actuaciones en ${actPag} página(s)`)

  // ── Descargar PDF solo para actuaciones nuevas (no están en DB) ──
  const resultado = []
  for (let i = 0; i < items.length; i++) {
    const item     = items[i]
    const fechaISO = parseDate(item.fecha)
    const detEsc   = esc(item.descripcion, 999)

    // Verificar si ya existe en DB
    const exists = fechaISO ? await dbQuery(`
      SELECT url_blob FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
        AND fecha   = '${fechaISO}'
        AND detalle = '${detEsc}'
    `).catch(() => []) : []

    const yaEnDB   = exists.length > 0
    const yaBlob   = exists[0]?.url_blob

    if (yaEnDB && yaBlob) {
      // Ya existe con PDF — no hacer nada
      resultado.push({ ...item, urlBlob: yaBlob })
      continue
    }

    console.log(`        📄 [${i+1}/${items.length}] ${item.fecha} — ${item.descripcion.substring(0, 55)}${item.dlHref ? ' ⬇️' : ''}${yaEnDB ? ' (sin PDF)' : ' 🆕'}`)

    let urlBlob      = yaBlob || null
    let textoExtraido = null
    if (item.dlHref && !yaBlob) {
      const dl = await descargarPorHref(page, item.dlHref, nroExp, item.fecha, i)
      urlBlob       = dl.blobUrl
      textoExtraido = dl.textoExtraido
      await page.waitForTimeout(500)
    }

    resultado.push({ ...item, urlBlob, textoExtraido })
  }

  return resultado
}

// ── Guardar actuaciones en DB ─────────────────────────────────────
async function guardarActuaciones(idPjnExp, actuaciones) {
  let nuevas = 0
  for (const a of actuaciones) {
    const fechaISO = parseDate(a.fecha)
    if (!fechaISO || !a.descripcion) continue

    const detEsc  = esc(a.descripcion, 999)
    const tipoEsc = esc(a.tipo, 99)
    const fojEsc  = esc(a.fojas, 49)

    const exists = await dbQuery(`
      SELECT 1 FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
        AND fecha   = '${fechaISO}'
        AND detalle = '${detEsc}'
    `)

    const blobEsc  = esc(a.urlBlob || '', 999)
    const textoEsc = a.textoExtraido ? esc(a.textoExtraido, 99999) : null

    if (exists.length === 0) {
      await dbQuery(`
        INSERT INTO pjn_actuaciones (id_pjn_expediente, fecha, tipo, detalle, fojas, url_blob, texto_extraido)
        VALUES (${idPjnExp}, '${fechaISO}', '${tipoEsc}', '${detEsc}', '${fojEsc}',
                ${blobEsc ? `'${blobEsc}'` : 'NULL'},
                ${textoEsc ? `'${textoEsc}'` : 'NULL'})
      `)
      nuevas++

      // Si hay caso interno vinculado, agregar movimiento
      const expRow = await dbQuery(`SELECT id_caso FROM pjn_expedientes WHERE id = ${idPjnExp}`)
      if (expRow[0]?.id_caso) {
        const idCaso = expRow[0].id_caso
        await dbQuery(`
          INSERT INTO movimientos (id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion, url_documento, id_usuario_registro)
          VALUES (${idCaso}, '${fechaISO}', '${tipoEsc}', '${detEsc.substring(0,199)}', 'Sincronizado desde PJN',
                  ${blobEsc ? `'${blobEsc}'` : 'NULL'}, 1)
        `).catch(e => console.warn(`      ⚠️  Mov interno: ${e.message}`))
      }
    } else if (blobEsc && a.urlBlob) {
      // Si ya existía la actuación pero ahora tenemos el documento, actualizar url_blob y texto
      await dbQuery(`
        UPDATE pjn_actuaciones
        SET url_blob='${blobEsc}'${textoEsc ? `, texto_extraido='${textoEsc}'` : ''}
        WHERE id_pjn_expediente=${idPjnExp} AND fecha='${fechaISO}' AND detalle='${detEsc}'
          AND url_blob IS NULL
      `).catch(() => {})
    }
  }
  return nuevas
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 PJN Scraper iniciado —', new Date().toLocaleString('es-AR'))

  const credenciales = await dbQuery(`SELECT email_usuario, pjn_cuit, pjn_password_enc FROM pjn_credenciales`)
  if (credenciales.length === 0) { console.log('⚠️  Sin credenciales'); process.exit(0) }
  console.log(`👥 ${credenciales.length} usuario(s)`)

  const browser = await chromium.launch({ headless: true })

  for (const cred of credenciales) {
    const email = cred.email_usuario
    console.log(`\n👤 ${email}`)

    const logRes = await dbQuery(`INSERT INTO pjn_sync_log (email_usuario) OUTPUT INSERTED.id VALUES ('${esc(email)}')`)
    const logId  = logRes[0]?.id
    let expCount = 0, actCount = 0

    try {
      const cuit     = cred.pjn_cuit
      const password = decrypt(cred.pjn_password_enc)
      const context  = await browser.newContext({ acceptDownloads: true })
      const page     = await context.newPage()

      // ── 1. Login ────────────────────────────────────────────
      console.log('  🔐 Login...')
      await page.goto('https://portalpjn.pjn.gov.ar', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('input[name="username"]', { timeout: 10000 })
      await page.fill('input[name="username"]', cuit)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"], input[type="submit"]')
      await page.waitForLoadState('networkidle', { timeout: 20000 })

      if (page.url().includes('sso.pjn.gov.ar')) throw new Error('Login fallido — credenciales incorrectas')
      console.log('  ✅ Login OK')

      // ── 2. Lista de expedientes como LETRADO ─────────────────
      await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
        waitUntil: 'networkidle', timeout: 30000
      })

      const letradoBtn = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
      if (letradoBtn) {
        // Solo clickear si no está ya activo
        const isActive = await page.evaluate(b => b.classList.contains('active'), letradoBtn)
        if (!isActive) {
          await letradoBtn.click()
          await page.waitForLoadState('networkidle', { timeout: 15000 })
        }
        // Esperar explícitamente a que la tabla tenga al menos 1 fila
        await page.waitForSelector('[id*="tablaConsultaForm"][id*="dataTable"] tbody tr', { timeout: 15000 }).catch(() => {})
        console.log('  ✅ Filtro LETRADO')
      }

      // ── 3. Extraer datos de la tabla con paginación ──────────
      // Tabla: tablaConsultaLista:tablaConsultaForm:j_idt179:dataTable
      // Columnas <td class="column">: nro | dependencia | carátula | situación | últ.act
      const leerFilasTabla = () => page.evaluate(() => {
          // Approach 1: tabla exacta por ID (tablaConsultaLista:...:dataTable)
          const tbl = document.querySelector('[id*="tablaConsultaForm"][id*="dataTable"], [id*="tablaConsulta"][id*="dataTable"]')
          if (tbl) {
            const rows = [...tbl.querySelectorAll('tbody tr')].map(tr => {
              const cols = [...tr.querySelectorAll('td.column')]
              if (cols.length < 4) return null
              const nro = cols[0]?.textContent.trim()
              if (!/^[A-Z]{2,4}\s+\d+\/\d{4}$/.test(nro)) return null
              return {
                nro,
                dependencia: cols[1]?.textContent.trim() || '',
                caratula:    cols[2]?.textContent.trim() || '',
                situacion:   cols[3]?.textContent.trim() || '',
                ultima_act:  cols[4]?.textContent.trim() || '',
              }
            }).filter(Boolean)
            if (rows.length > 0) return rows
          }
          // Fallback: escanear todos los td buscando el patrón nro (ej: CCF 002729/2026)
          const rows = []
          const tds  = [...document.querySelectorAll('td')]
          for (let i = 0; i < tds.length; i++) {
            const txt = tds[i].textContent.trim()
            if (/^[A-Z]{2,4}\s+\d+\/\d{4}$/.test(txt)) {
              rows.push({
                nro:         txt,
                dependencia: tds[i+1]?.textContent.trim() || '',
                caratula:    tds[i+2]?.textContent.trim() || '',
                situacion:   tds[i+3]?.textContent.trim() || '',
                ultima_act:  tds[i+4]?.textContent.trim() || '',
              })
            }
          }
          return rows
        })

      const filas = []
      let listPag = 1
      while (true) {
        const batch = await leerFilasTabla()
        filas.push(...batch)
        // Buscar botón "siguiente página" en la paginación de la tabla
        const nextPag = await page.$('.pagination li:not(.disabled) a[aria-label="Next"], .pagination a:has(span[aria-hidden="true"]:text-is("»")), .rf-ds-btn-next:not(.rf-ds-dis)')
        if (!nextPag || listPag >= 20) break
        await nextPag.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
        listPag++
      }

      console.log(`  📁 ${filas.length} expediente(s)`)

      // ── 4. Para cada expediente: abrir Libro Digital ─────────
      for (let idx = 0; idx < filas.length; idx++) {
        const fila = filas[idx]
        console.log(`\n  📂 [${idx+1}/${filas.length}] ${fila.nro} — ${fila.caratula.substring(0,50)}`)

        const nroEsc   = esc(fila.nro, 49)
        const emailEsc = esc(email)

        // Buscar caso interno
        const casoInt = await dbQuery(`SELECT id_caso FROM casos WHERE nro_expediente = '${nroEsc}' AND activo = 1`).catch(() => [])
        const idCaso  = casoInt[0]?.id_caso || null

        // Upsert expediente
        await dbQuery(`
          MERGE pjn_expedientes AS t
          USING (SELECT '${emailEsc}' AS e, '${nroEsc}' AS n) AS s ON t.email_usuario=s.e AND t.nro_expediente=s.n
          WHEN MATCHED THEN UPDATE SET
            caratula='${esc(fila.caratula)}', dependencia='${esc(fila.dependencia)}',
            situacion='${esc(fila.situacion,99)}',
            ultima_act=${fila.ultima_act ? `'${parseDate(fila.ultima_act)}'` : 'NULL'},
            id_caso=${idCaso ?? 'NULL'}, fecha_sync=GETDATE()
          WHEN NOT MATCHED THEN INSERT (email_usuario,nro_expediente,caratula,dependencia,situacion,ultima_act,id_caso)
          VALUES ('${emailEsc}','${nroEsc}','${esc(fila.caratula)}','${esc(fila.dependencia)}',
                  '${esc(fila.situacion,99)}',${fila.ultima_act ? `'${parseDate(fila.ultima_act)}'` : 'NULL'},${idCaso ?? 'NULL'});
        `)

        const idRow    = await dbQuery(`SELECT id FROM pjn_expedientes WHERE email_usuario='${emailEsc}' AND nro_expediente='${nroEsc}'`)
        const idPjnExp = idRow[0]?.id
        if (!idPjnExp) continue

        // Volver a la lista
        await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
          waitUntil: 'networkidle', timeout: 30000
        })
        const letBtn2 = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
        if (letBtn2) {
          const isActive2 = await page.evaluate(b => b.classList.contains('active'), letBtn2)
          if (!isActive2) { await letBtn2.click(); await page.waitForLoadState('networkidle', { timeout: 15000 }) }
          await page.waitForSelector('[id*="tablaConsultaForm"][id*="dataTable"] tbody tr', { timeout: 15000 }).catch(() => {})
        }

        let navegoExp = false

        // El botón del ojo: <a href="#" onclick="...mojarra.jsfcljs(...)">
        //   <i class="fa fa-eye fa-lg"> <span>visualizar expediente</span>
        // Estrategia 1: buscar en la fila por fa-eye
        try {
          const fila$ = page.locator(`td:text-is("${fila.nro}")`).first()
          if (await fila$.isVisible({ timeout: 3000 })) {
            const filaRow = fila$.locator('xpath=ancestor::tr[1]')
            const eyeBtn  = filaRow.locator('a:has(i.fa-eye), a:has(.fa-eye)').first()
            if (await eyeBtn.isVisible({ timeout: 2000 })) {
              await eyeBtn.click()
              await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              navegoExp = page.url().includes('expediente.seam')
            }
          }
        } catch (_) {}

        // Estrategia 2: Nth botón fa-eye en la página (por índice de expediente)
        if (!navegoExp) {
          console.log(`    🔽 Fallback: eye por índice ${idx}`)
          try {
            const eyeBtns = page.locator('a:has(i.fa-eye), a:has(.fa-eye)')
            const count   = await eyeBtns.count()
            console.log(`       Botones eye encontrados: ${count}`)
            if (idx < count) {
              await eyeBtns.nth(idx).click()
              await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              navegoExp = page.url().includes('expediente.seam')
            }
          } catch (_) {}
        }

        if (!navegoExp) {
          console.log(`    ⚠️  No se pudo abrir expediente.seam. URL: ${page.url()}`)
          continue
        }

        console.log(`    🔗 ${page.url()}`)

        // Extraer y guardar actuaciones
        try {
          const acts   = await extraerActuacionesExpediente(page, fila.nro, idPjnExp)
          const nuevas = await guardarActuaciones(idPjnExp, acts)
          console.log(`    ✅ ${acts.length} actuaciones, ${nuevas} nuevas`)
          actCount += nuevas
        } catch (e) {
          console.warn(`    ⚠️  Error actuaciones: ${e.message}`)
        }

        expCount++
        await page.waitForTimeout(1000)
      }

      await context.close()

      await dbQuery(`
        UPDATE pjn_sync_log SET fecha_fin=GETDATE(), expedientes=${expCount}, actuaciones_new=${actCount}, estado='ok'
        WHERE id=${logId}
      `)
      console.log(`\n  ✅ Listo: ${expCount} exp, ${actCount} actuaciones nuevas`)

    } catch (err) {
      console.error(`  ❌ ${err.message}`)
      if (logId) await dbQuery(`UPDATE pjn_sync_log SET fecha_fin=GETDATE(), estado='error', error='${esc(err.message,999)}' WHERE id=${logId}`)
    }
  }

  await browser.close()
  await pool?.close()
  console.log('\n🏁 Finalizado —', new Date().toLocaleString('es-AR'))
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1) })
