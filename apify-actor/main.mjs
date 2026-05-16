/**
 * PJN Scraper — Silva Ortiz (Apify Actor)
 * Usa proxy residencial argentino via Apify Proxy
 */

import { Actor } from 'apify'
import { chromium } from 'playwright'
import sql from 'mssql'
import crypto from 'crypto'
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

await Actor.init()

const input = await Actor.getInput() ?? {}

const DATABASE_URL           = input.DATABASE_URL           || process.env.DATABASE_URL
const ENCRYPTION_KEY         = input.ENCRYPTION_KEY         || process.env.ENCRYPTION_KEY
const AZURE_STORAGE_CONN_STR = input.AZURE_STORAGE_CONN_STR || process.env.AZURE_STORAGE_CONN_STR
const CALLBACK_URL           = input.CALLBACK_URL           || process.env.CALLBACK_URL
const BLOB_CONTAINER         = 'pjn-documentos'

if (!DATABASE_URL)   { console.error('❌ DATABASE_URL no configurado'); await Actor.exit(); process.exit(1) }
if (!ENCRYPTION_KEY) { console.error('❌ ENCRYPTION_KEY no configurado'); await Actor.exit(); process.exit(1) }
if (!AZURE_STORAGE_CONN_STR) console.warn('⚠️  AZURE_STORAGE_CONN_STR no configurado — documentos no se subirán')

// ── Proxy: usar IPs directas de Apify (limpias y sin bloqueos) ─────
// El proxy residencial AR requiere plan SCALE+. Por ahora se usa conexión
// directa desde los servidores de Apify. Se puede activar proxy editando
// la variable proxyUrl más abajo si se upgradea el plan.
const proxyUrl = undefined
console.log('🌐 Conexión directa desde servidores Apify')

// ── Azure Blob ─────────────────────────────────────────────────────
let blobContainer = null
async function getBlobContainer() {
  if (blobContainer) return blobContainer
  if (!AZURE_STORAGE_CONN_STR) return null
  const client  = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONN_STR)
  blobContainer = client.getContainerClient(BLOB_CONTAINER)
  await blobContainer.createIfNotExists()
  return blobContainer
}

async function subirPDF(buffer, nombre) {
  const container = await getBlobContainer()
  if (!container) return null
  const blobName = nombre.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blob     = container.getBlockBlobClient(blobName)
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: 'application/pdf' } })
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 2)
  return await blob.generateSasUrl({ permissions: BlobSASPermissions.parse('r'), expiresOn: expiry })
}

// ── Crypto ─────────────────────────────────────────────────────────
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

// ── DB ─────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function esc(s, max = 499) {
  return (String(s || '')).replace(/'/g, "''").substring(0, max)
}

// ── Extraer texto de un buffer PDF ────────────────────────────────
async function extraerTextoPDF(buffer) {
  try {
    const data = await pdfParse(buffer)
    const texto = data.text?.trim() ?? ''
    if (texto.length < 10) return null
    console.log(`          📝 Texto extraído: ${texto.length} caracteres`)
    return texto
  } catch (e) {
    console.warn(`          ⚠️  No se pudo extraer texto del PDF: ${e.message.substring(0, 80)}`)
    return null
  }
}

// ── PDF download ───────────────────────────────────────────────────
// Retorna { blobUrl, textoExtraido }
async function descargarPorHref(page, href, nroExp, fecha, idx) {
  try {
    const url = href.startsWith('http') ? href : `https://scw.pjn.gov.ar${href}`
    const arr = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include' })
      if (!r.ok) return null
      return Array.from(new Uint8Array(await r.arrayBuffer()))
    }, url)
    if (!arr || arr.length < 500) return { blobUrl: null, textoExtraido: null }
    const pdfBuffer = Buffer.from(arr)
    const nombre    = `${nroExp.replace(/\s/g, '_')}_${fecha.replace(/\//g, '-')}_${idx}.pdf`
    const [blobUrl, textoExtraido] = await Promise.all([
      subirPDF(pdfBuffer, nombre),
      extraerTextoPDF(pdfBuffer),
    ])
    if (blobUrl) console.log(`          ☁️  Subido: ${blobUrl.split('?')[0]}`)
    return { blobUrl, textoExtraido }
  } catch (e) {
    console.warn(`          ⚠️  Error descarga: ${e.message.substring(0, 80)}`)
    return { blobUrl: null, textoExtraido: null }
  }
}

// ── Extraer actuaciones ────────────────────────────────────────────
async function extraerActuacionesExpediente(page, nroExp, idPjnExp) {
  await page.waitForSelector('[id="expediente:action-table"]', { timeout: 15000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

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

  function leerFilasActuaciones() {
    return page.evaluate(() => {
      function celda(td) {
        if (!td) return ''
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

  const items = []
  let actPag = 1
  while (true) {
    const batch = await leerFilasActuaciones()
    items.push(...batch)
    const nextPageLocator = page.locator(`[id*="divPagesAct"] li:not(.active) a`).filter({ hasText: String(actPag + 1) })
    const hasNext = await nextPageLocator.count() > 0
    if (!hasNext || actPag >= 30) break
    await nextPageLocator.first().click()
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(800)
    actPag++
  }

  console.log(`      📊 ${items.length} actuaciones en ${actPag} página(s)`)

  const resultado = []
  for (let i = 0; i < items.length; i++) {
    const item     = items[i]
    const fechaISO = parseDate(item.fecha)
    const detEsc   = esc(item.descripcion, 999)

    const exists = fechaISO ? await dbQuery(`
      SELECT url_blob FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
        AND fecha   = '${fechaISO}'
        AND detalle = '${detEsc}'
    `).catch(() => []) : []

    const yaEnDB = exists.length > 0
    const yaBlob = exists[0]?.url_blob

    if (yaEnDB && yaBlob) { resultado.push({ ...item, urlBlob: yaBlob }); continue }

    console.log(`        📄 [${i+1}/${items.length}] ${item.fecha} — ${item.descripcion.substring(0, 55)}${item.dlHref ? ' ⬇️' : ''}${yaEnDB ? ' (sin PDF)' : ' 🆕'}`)

    let urlBlob       = yaBlob || null
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

// ── Guardar actuaciones ────────────────────────────────────────────
async function guardarActuaciones(idPjnExp, actuaciones) {
  let nuevas = 0
  for (const a of actuaciones) {
    const fechaISO = parseDate(a.fecha)
    if (!fechaISO || !a.descripcion) continue
    const detEsc  = esc(a.descripcion, 999)
    const tipoEsc = esc(a.tipo, 99)
    const fojEsc  = esc(a.fojas, 49)
    const exists  = await dbQuery(`
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
      const expRow = await dbQuery(`SELECT id_caso FROM pjn_expedientes WHERE id = ${idPjnExp}`)
      if (expRow[0]?.id_caso) {
        const idCaso = expRow[0].id_caso
        await dbQuery(`
          INSERT INTO movimientos (id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion, url_documento, id_usuario_registro)
          VALUES (${idCaso}, '${fechaISO}', '${tipoEsc}', '${detEsc.substring(0,199)}', 'Sincronizado desde PJN (Apify)',
                  ${blobEsc ? `'${blobEsc}'` : 'NULL'}, 1)
        `).catch(e => console.warn(`      ⚠️  Mov interno: ${e.message}`))
      }
    } else if (blobEsc && a.urlBlob) {
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

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 PJN Scraper (Apify) iniciado —', new Date().toLocaleString('es-AR'))

  const credenciales = await dbQuery(`SELECT email_usuario, pjn_cuit, pjn_password_enc FROM pjn_credenciales`)
  if (credenciales.length === 0) { console.log('⚠️  Sin credenciales'); return }
  console.log(`👥 ${credenciales.length} usuario(s)`)

  const browser = await chromium.launch({
    headless: true,
    args: proxyUrl ? [`--proxy-server=${proxyUrl}`] : [],
  })

  const summary = { expedientes: 0, actuacionesNew: 0, errores: 0 }

  for (const cred of credenciales) {
    const email = cred.email_usuario
    console.log(`\n👤 ${email}`)

    const logRes = await dbQuery(`INSERT INTO pjn_sync_log (email_usuario) OUTPUT INSERTED.id VALUES ('${esc(email)}')`)
    const logId  = logRes[0]?.id
    let expCount = 0, actCount = 0

    try {
      const cuit     = cred.pjn_cuit
      const password = decrypt(cred.pjn_password_enc)

      const context = await browser.newContext({ acceptDownloads: true })
      const page    = await context.newPage()

      // ── 1. Login ───────────────────────────────────────────
      console.log('  🔐 Login...')
      await page.goto('https://portalpjn.pjn.gov.ar', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('input[name="username"]', { timeout: 15000 })
      await page.fill('input[name="username"]', cuit)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"], input[type="submit"]')
      await page.waitForLoadState('networkidle', { timeout: 20000 })
      if (page.url().includes('sso.pjn.gov.ar')) throw new Error('Login fallido — credenciales incorrectas')
      console.log('  ✅ Login OK')

      // ── 2. Lista expedientes como LETRADO ─────────────────
      await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
        waitUntil: 'networkidle', timeout: 30000,
      })
      const letradoBtn = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
      if (letradoBtn) {
        const isActive = await page.evaluate(b => b.classList.contains('active'), letradoBtn)
        if (!isActive) { await letradoBtn.click(); await page.waitForLoadState('networkidle', { timeout: 15000 }) }
        await page.waitForSelector('[id*="tablaConsultaForm"][id*="dataTable"] tbody tr', { timeout: 15000 }).catch(() => {})
        console.log('  ✅ Filtro LETRADO')
      }

      // ── 3. Extraer filas con paginación ───────────────────
      const leerFilasTabla = () => page.evaluate(() => {
        const tbl = document.querySelector('[id*="tablaConsultaForm"][id*="dataTable"], [id*="tablaConsulta"][id*="dataTable"]')
        if (tbl) {
          const rows = [...tbl.querySelectorAll('tbody tr')].map(tr => {
            const cols = [...tr.querySelectorAll('td.column')]
            if (cols.length < 4) return null
            const nro = cols[0]?.textContent.trim()
            if (!/^[A-Z]{2,4}\s+\d+\/\d{4}$/.test(nro)) return null
            return { nro, dependencia: cols[1]?.textContent.trim() || '', caratula: cols[2]?.textContent.trim() || '', situacion: cols[3]?.textContent.trim() || '', ultima_act: cols[4]?.textContent.trim() || '' }
          }).filter(Boolean)
          if (rows.length > 0) return rows
        }
        const rows = []
        const tds  = [...document.querySelectorAll('td')]
        for (let i = 0; i < tds.length; i++) {
          const txt = tds[i].textContent.trim()
          if (/^[A-Z]{2,4}\s+\d+\/\d{4}$/.test(txt)) {
            rows.push({ nro: txt, dependencia: tds[i+1]?.textContent.trim() || '', caratula: tds[i+2]?.textContent.trim() || '', situacion: tds[i+3]?.textContent.trim() || '', ultima_act: tds[i+4]?.textContent.trim() || '' })
          }
        }
        return rows
      })

      const filas = []
      let listPag = 1
      while (true) {
        const batch = await leerFilasTabla()
        filas.push(...batch)
        const nextPag = await page.$('.pagination li:not(.disabled) a[aria-label="Next"], .rf-ds-btn-next:not(.rf-ds-dis)')
        if (!nextPag || listPag >= 20) break
        await nextPag.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
        listPag++
      }
      console.log(`  📁 ${filas.length} expediente(s)`)

      // ── 4. Para cada expediente: actuaciones ──────────────
      for (let idx = 0; idx < filas.length; idx++) {
        const fila     = filas[idx]
        console.log(`\n  📂 [${idx+1}/${filas.length}] ${fila.nro} — ${fila.caratula.substring(0,50)}`)
        const nroEsc   = esc(fila.nro, 49)
        const emailEsc = esc(email)
        const casoInt  = await dbQuery(`SELECT id_caso FROM casos WHERE nro_expediente = '${nroEsc}' AND activo = 1`).catch(() => [])
        const idCaso   = casoInt[0]?.id_caso || null

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
        await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', { waitUntil: 'networkidle', timeout: 30000 })
        const letBtn2 = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
        if (letBtn2) {
          const isActive2 = await page.evaluate(b => b.classList.contains('active'), letBtn2)
          if (!isActive2) { await letBtn2.click(); await page.waitForLoadState('networkidle', { timeout: 15000 }) }
          await page.waitForSelector('[id*="tablaConsultaForm"][id*="dataTable"] tbody tr', { timeout: 15000 }).catch(() => {})
        }

        let navegoExp = false
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

        if (!navegoExp) {
          try {
            const eyeBtns = page.locator('a:has(i.fa-eye), a:has(.fa-eye)')
            const count   = await eyeBtns.count()
            if (idx < count) {
              await eyeBtns.nth(idx).click()
              await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              navegoExp = page.url().includes('expediente.seam')
            }
          } catch (_) {}
        }

        if (!navegoExp) { console.log(`    ⚠️  No se pudo abrir expediente.seam`); continue }

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
      await dbQuery(`UPDATE pjn_sync_log SET fecha_fin=GETDATE(), expedientes=${expCount}, actuaciones_new=${actCount}, estado='ok' WHERE id=${logId}`)
      summary.expedientes   += expCount
      summary.actuacionesNew += actCount
      console.log(`\n  ✅ Listo: ${expCount} exp, ${actCount} actuaciones nuevas`)

    } catch (err) {
      console.error(`  ❌ ${err.message}`)
      summary.errores++
      if (logId) await dbQuery(`UPDATE pjn_sync_log SET fecha_fin=GETDATE(), estado='error', error='${esc(err.message,999)}' WHERE id=${logId}`)
    }
  }

  await browser.close()
  await pool?.close()
  console.log('\n🏁 Finalizado —', new Date().toLocaleString('es-AR'))

  // ── Guardar resultado en el dataset del actor ──────────────────
  await Actor.pushData(summary)

  // ── Notificar a la app vía webhook ────────────────────────────
  if (CALLBACK_URL) {
    try {
      await fetch(CALLBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: summary.errores === 0 ? 'ok' : 'partial', ...summary }),
      })
      console.log('📡 Callback enviado a', CALLBACK_URL)
    } catch (e) {
      console.warn('⚠️  Callback falló:', e.message)
    }
  }
}

await main()
await Actor.exit()
