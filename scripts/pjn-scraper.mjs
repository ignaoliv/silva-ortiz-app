/**
 * PJN Scraper — Silva Ortiz
 * node scripts/pjn-scraper.mjs
 */

import { chromium } from 'playwright'
import sql from 'mssql'
import { readFileSync, promises as fsPromises } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'
import { BlobServiceClient } from '@azure/storage-blob'

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
    permissions: { read: true },
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
  const [d, m, y] = str.trim().split('/')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

function esc(s, max = 499) {
  return (String(s || '')).replace(/'/g, "''").substring(0, max)
}

// ── Descargar PDF clickeando el botón de descarga directo ────────
async function descargarDocumentoDirecto(page, dlBtnId, nroExp, fecha, idx) {
  try {
    const btn = page.locator(`[id="${dlBtnId}"]`)
    const [popup, download] = await Promise.all([
      page.waitForEvent('popup',    { timeout: 12000 }).catch(() => null),
      page.waitForEvent('download', { timeout: 12000 }).catch(() => null),
      btn.click(),
    ])
    await page.waitForTimeout(1000)

    let pdfBuffer = null

    if (download) {
      const tmpPath = await download.path()
      if (tmpPath) {
        pdfBuffer = await fsPromises.readFile(tmpPath)
        console.log(`          📡 PDF via download (${pdfBuffer.length} bytes)`)
      }
    } else if (popup) {
      console.log(`          🗔 PDF en popup: ${popup.url()}`)
      await popup.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
      // Intentar leer PDF de la URL de la popup
      const arr = await popup.evaluate(async () => {
        const r = await fetch(window.location.href, { credentials: 'include' })
        if (!r.ok) return null
        return Array.from(new Uint8Array(await r.arrayBuffer()))
      }).catch(() => null)
      if (arr) pdfBuffer = Buffer.from(arr)
      pdfBuffer = pdfBuffer || null
      await popup.close().catch(() => {})
    } else {
      console.log(`          ⚠️  Sin popup ni download`)
    }

    if (!pdfBuffer || pdfBuffer.length < 100) {
      console.log(`          📄 Sin documento (${pdfBuffer?.length ?? 0} bytes)`)
      return null
    }

    const nombre  = `${nroExp}_${fecha.replace(/\//g, '-')}_${idx}.pdf`
    const blobUrl = await subirPDF(pdfBuffer, nombre)
    if (blobUrl) console.log(`          ☁️  Subido: ${blobUrl.split('?')[0]}`)
    return blobUrl

  } catch (e) {
    console.warn(`          ⚠️  Error descarga: ${e.message.substring(0, 80)}`)
    return null
  }
}

// ── Extraer actuaciones desde expediente.seam ────────────────────
async function extraerActuacionesExpediente(page, nroExp) {
  // Asegurarse de estar en la pestaña Actuaciones
  await page.locator('text=Actuaciones').first().click().catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(500)

  // Leer la tabla de actuaciones
  const items = await page.evaluate(() => {
    // Buscar la tabla que tiene columnas FECHA y TIPO
    const tables = [...document.querySelectorAll('table')]
    const tbl = tables.find(t => {
      const txt = (t.querySelector('thead, tr') || t).textContent || ''
      return /FECHA/i.test(txt) && /TIPO/i.test(txt)
    }) || tables.find(t => [...t.querySelectorAll('td')].some(td => /\d{2}\/\d{2}\/\d{4}/.test(td.textContent)))

    if (!tbl) return []

    const rows = [...tbl.querySelectorAll('tbody tr, tr')].filter(tr => {
      const tds = tr.querySelectorAll('td')
      return tds.length >= 3
    })

    return rows.map(tr => {
      const cells = [...tr.querySelectorAll('td')]

      // Encontrar la celda con la fecha
      const fechaCell = cells.find(td => /^\d{2}\/\d{2}\/\d{4}$/.test(td.textContent.trim()))
      if (!fechaCell) return null
      const fi = cells.indexOf(fechaCell)

      const fecha       = fechaCell.textContent.trim()
      const tipo        = cells[fi + 1]?.textContent.trim() || ''
      const descripcion = cells[fi + 2]?.textContent.trim() || ''
      const fojas       = cells[fi + 3]?.textContent.trim() || ''

      // Botón de descarga: buscar en las celdas ANTES de la fecha (columnas de acción)
      let dlBtnId = null
      for (let i = 0; i < fi; i++) {
        const a = cells[i].querySelector('a[id], button[id]')
        if (a) { dlBtnId = a.id; break }
      }

      return {
        fecha,
        tipo:        tipo.substring(0, 99),
        descripcion: descripcion.substring(0, 999),
        fojas:       fojas.substring(0, 49),
        dlBtnId,
      }
    }).filter(Boolean)
  })

  console.log(`      📊 ${items.length} actuaciones encontradas`)
  if (items.length === 0) {
    const txt = await page.evaluate(() => document.body.innerText.substring(0, 400))
    console.log(`      📄 Body: ${txt}`)
  }

  // Descargar documentos
  const resultado = []
  const expUrl    = page.url()
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const tieneDoc = !!item.dlBtnId
    console.log(`        📄 [${i+1}/${items.length}] ${item.fecha} — ${item.descripcion.substring(0, 60)} ${tieneDoc ? '⬇️' : ''}`)

    let urlBlob = null
    if (tieneDoc) {
      // Volver al expediente si nos fuimos
      if (!page.url().includes('expediente.seam')) {
        await page.goto(expUrl, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {})
        await page.locator('text=Actuaciones').first().click().catch(() => {})
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
      }
      urlBlob = await descargarDocumentoDirecto(page, item.dlBtnId, nroExp.replace(/\s/g, '_'), item.fecha, i)
      await page.waitForTimeout(800)
    }

    resultado.push({ ...item, urlBlob })
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

    const blobEsc = esc(a.urlBlob || '', 999)

    if (exists.length === 0) {
      await dbQuery(`
        INSERT INTO pjn_actuaciones (id_pjn_expediente, fecha, tipo, detalle, fojas, url_blob)
        VALUES (${idPjnExp}, '${fechaISO}', '${tipoEsc}', '${detEsc}', '${fojEsc}', ${blobEsc ? `'${blobEsc}'` : 'NULL'})
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
      // Si ya existía la actuación pero ahora tenemos el documento, actualizar url_blob
      await dbQuery(`
        UPDATE pjn_actuaciones SET url_blob='${blobEsc}'
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
        await letradoBtn.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
        console.log('  ✅ Filtro LETRADO')
      }

      // ── 3. Extraer datos de la tabla de expedientes ──────────
      const filas = await page.evaluate(() => {
        const rows = []
        const tds  = [...document.querySelectorAll('td')]
        for (let i = 0; i < tds.length; i++) {
          const txt = tds[i].textContent.trim()
          if (/^[A-Z]{2,4}\s+\d+\/\d{4}$/.test(txt)) {
            rows.push({
              nro:        txt,
              dependencia: tds[i+1]?.textContent.trim() || '',
              caratula:    tds[i+2]?.textContent.trim() || '',
              situacion:   tds[i+3]?.textContent.trim() || '',
              ultima_act:  tds[i+4]?.textContent.trim() || '',
            })
          }
        }
        return rows
      })

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
        if (letBtn2) { await letBtn2.click(); await page.waitForLoadState('networkidle', { timeout: 15000 }) }

        let navegoExp = false

        // Estrategia 1: ícono del ojo (👁) en la fila → expediente.seam
        try {
          const fila$ = await page.locator(`td:text-is("${fila.nro}")`).first()
          if (await fila$.isVisible({ timeout: 3000 })) {
            const filaRow = fila$.locator('xpath=ancestor::tr[1]')
            // El ícono del ojo suele ser un <a> o <button> con una imagen/icono
            // Probamos todos los links de la fila hasta encontrar el que va a expediente.seam
            const links = filaRow.locator('a, button')
            const count = await links.count()
            for (let li = 0; li < count && !navegoExp; li++) {
              const lnk    = links.nth(li)
              const href   = await lnk.getAttribute('href').catch(() => '')
              const title  = await lnk.getAttribute('title').catch(() => '')
              const ltext  = await lnk.textContent().catch(() => '')
              const isEye  = /expediente|ver|view|👁/i.test(href + title + ltext)
              if (isEye || li === 0) {  // probar el primero y cualquier match
                await lnk.click()
                await page.waitForTimeout(1500)
                if (page.url().includes('expediente.seam')) { navegoExp = true; break }
                // Si abrió un dropdown, cerrar y probar siguiente
                await page.keyboard.press('Escape').catch(() => {})
              }
            }
          }
        } catch (_) {}

        // Estrategia 2: dropdown → buscar opción distinta a "Libro digital"
        if (!navegoExp) {
          console.log(`    🔽 Fallback: dropdown por índice ${idx}`)
          const dropdownBtns = await page.$$('button.dropdown-toggle, button[data-toggle="dropdown"], .btn-group button:last-child, td:last-child button')
          console.log(`       Botones encontrados: ${dropdownBtns.length}`)
          if (dropdownBtns[idx]) {
            await dropdownBtns[idx].click()
            await page.waitForTimeout(800)
            // Primero intentar "Ver expediente" o link a expediente.seam
            const expLink = await page.$('a[href*="expediente.seam"], a:has-text("Ver expediente"), li:has-text("Ver expediente") a')
            if (expLink) {
              await expLink.click()
              await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              navegoExp = page.url().includes('expediente.seam')
            }
          }
        }

        // Estrategia 3: link directo en la página a expediente.seam
        if (!navegoExp) {
          const expDirecto = await page.$('a[href*="expediente.seam"]')
          if (expDirecto) {
            await expDirecto.click()
            await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
            navegoExp = page.url().includes('expediente.seam')
          }
        }

        if (!navegoExp) {
          console.log(`    ⚠️  No se pudo abrir expediente.seam. URL: ${page.url()}`)
          continue
        }

        console.log(`    🔗 ${page.url()}`)

        // Extraer y guardar actuaciones
        try {
          const acts   = await extraerActuacionesExpediente(page, fila.nro)
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
