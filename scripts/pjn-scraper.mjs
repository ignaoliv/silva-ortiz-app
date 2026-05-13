/**
 * PJN Scraper — Silva Ortiz
 * node scripts/pjn-scraper.mjs
 */

import { chromium } from 'playwright'
import sql from 'mssql'
import { readFileSync } from 'fs'
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
  await blobContainer.createIfNotExists({ access: 'blob' })
  return blobContainer
}

async function subirPDF(buffer, nombre) {
  const container = await getBlobContainer()
  if (!container) return null
  const blobName  = nombre.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blob      = container.getBlockBlobClient(blobName)
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: 'application/pdf' } })
  return blob.url
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

// ── Encontrar elementos clickeables del panel izquierdo ───────────
async function encontrarItemsPanel(page) {
  return page.evaluate(() => {
    const selectors = [
      '.rich-table-row',
      '[class*="actuacion"]',
      '[id*="actuacion"]',
      '.panel-left tr',
      '.left-panel tr',
      'table tr',
      'ul li',
      '.list-group-item',
    ]

    let items = []
    for (const sel of selectors) {
      const found = [...document.querySelectorAll(sel)]
      const conFecha = found.filter(el => /\d{2}\/\d{2}\/\d{4}/.test(el.textContent || ''))
      if (conFecha.length > 0) { items = conFecha; break }
    }

    if (items.length === 0) {
      items = [...document.querySelectorAll('div, td, li, span')].filter(el => {
        const t = el.textContent || ''
        return /\d{2}\/\d{2}\/\d{4}/.test(t) && t.length > 15 && t.length < 2000
          && !el.querySelector('div, td, li')
      })
    }

    return items.map((el, idx) => {
      const texto = (el.innerText || el.textContent || '').trim()
      const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/)
      if (!fechaMatch) return null
      const fecha = fechaMatch[1]
      const fojasMatch = texto.match(/fs\.\s*([\d\s\/]+)/i) || texto.match(/foja[s]?\s+([\d\s\/]+)/i)
      const fojas = fojasMatch ? fojasMatch[1].trim() : ''
      const badgeEl = el.querySelector('[class*="badge"],[class*="circle"],[class*="tipo"],[class*="label"]')
      const tipo = badgeEl?.textContent?.trim().substring(0, 10) || ''
      const lineas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean)
      const desc = lineas
        .filter(l => !l.match(/^\d{2}\/\d{2}\/\d{4}$/) && !l.match(/^fs\./i) && !l.match(/^foja/i) && l.length > 2)
        .join(' ').trim().substring(0, 900)

      // Guardar un selector único para poder hacer click desde Playwright
      const id = el.id ? `#${el.id}` : null
      return { fecha, tipo, descripcion: desc, fojas, domIdx: idx, domId: id }
    }).filter(Boolean)
  })
}

// ── Descargar PDF que se carga en el panel derecho al clickear una fila ─
async function descargarDocumentoActuacion(page, itemSelector, nroExp, fecha, idx) {
  try {
    // Interceptar la respuesta del PDF antes de clickear
    let pdfBuffer = null
    let pdfUrl    = null

    const responsePromise = page.waitForResponse(
      res => res.headers()['content-type']?.includes('pdf') ||
             res.url().includes('.pdf') ||
             res.url().includes('verDocumento') ||
             res.url().includes('getDoc') ||
             res.url().includes('descargar'),
      { timeout: 12000 }
    ).catch(() => null)

    // Click en la fila del panel izquierdo
    await page.evaluate((sel, domIdx) => {
      let el
      if (sel) {
        el = document.querySelector(sel)
      } else {
        // Buscar por índice entre elementos con fecha
        const todos = [...document.querySelectorAll('div, td, li, tr, span')].filter(e =>
          /\d{2}\/\d{2}\/\d{4}/.test(e.textContent || '') &&
          (e.textContent || '').length < 2000 &&
          !e.querySelector('div, td, li, tr')
        )
        el = todos[domIdx]
      }
      if (el) el.click()
    }, itemSelector, idx)

    const response = await responsePromise
    if (response && response.ok()) {
      pdfUrl    = response.url()
      pdfBuffer = await response.body()
    }

    // Fallback: buscar iframe/embed/object con PDF en el panel derecho
    if (!pdfBuffer) {
      await page.waitForTimeout(2000)
      pdfUrl = await page.evaluate(() => {
        const src = document.querySelector('iframe[src*="pdf"], iframe[src*="Doc"], embed[src], object[data]')
        return src?.getAttribute('src') || src?.getAttribute('data') || null
      })
      if (pdfUrl) {
        if (!pdfUrl.startsWith('http')) {
          pdfUrl = new URL(pdfUrl, 'https://scw.pjn.gov.ar').href
        }
        // Descargar con fetch autenticado (usa las cookies de la sesión)
        pdfBuffer = await page.evaluate(async (url) => {
          const r = await fetch(url, { credentials: 'include' })
          if (!r.ok) return null
          const buf = await r.arrayBuffer()
          return Array.from(new Uint8Array(buf))
        }, pdfUrl)
        if (pdfBuffer) pdfBuffer = Buffer.from(pdfBuffer)
      }
    }

    if (!pdfBuffer || pdfBuffer.length < 100) {
      console.log(`        📄 Sin documento (${pdfBuffer?.length ?? 0} bytes)`)
      return null
    }

    // Nombre único: nroExp_fecha_idx.pdf
    const nombre    = `${nroExp}_${fecha.replace(/\//g, '-')}_${idx}.pdf`
    const blobUrl   = await subirPDF(pdfBuffer, nombre)
    if (blobUrl) console.log(`        ☁️  Subido: ${blobUrl.split('?')[0]}`)
    return blobUrl

  } catch (e) {
    console.warn(`        ⚠️  Error doc: ${e.message.substring(0, 80)}`)
    return null
  }
}

// ── Extraer actuaciones del Libro Digital ─────────────────────────
async function extraerActuacionesLibroDigital(page, nroExp) {
  const todas  = []
  let   pagina = 1

  while (true) {
    console.log(`      📄 Página ${pagina}...`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Log HTML para debug solo en pág 1
    if (pagina === 1) {
      const snip = await page.evaluate(() => {
        const b = document.body.innerHTML
        const i = b.toLowerCase().indexOf('actuaci')
        return i > -1 ? b.substring(Math.max(0, i - 100), i + 600) : b.substring(0, 600)
      })
      console.log(`      🔍 HTML: ${snip.substring(0, 500)}`)
    }

    const items = await encontrarItemsPanel(page)
    console.log(`         ${items.length} actuaciones encontradas`)

    if (items.length === 0 && pagina === 1) {
      const txt = await page.evaluate(() => document.body.innerText)
      console.log(`         Texto body: ${txt.substring(0, 600)}`)
    }

    // Para cada actuación: clickear la fila y bajar el documento
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      console.log(`        🖱️  [${i+1}/${items.length}] ${item.fecha} — ${item.descripcion.substring(0, 50)}`)

      const urlBlob = await descargarDocumentoActuacion(
        page,
        item.domId ? `#${item.domId}` : null,
        nroExp.replace(/\s/g, '_'),
        item.fecha,
        i
      )
      todas.push({ ...item, urlBlob })

      // Pequeña pausa entre clicks para no saturar el server
      await page.waitForTimeout(1000)
    }

    // Paginación
    const hayNext = await page.evaluate((pag) => {
      return [...document.querySelectorAll('a, button, span[onclick], td[onclick]')].some(el => {
        const t = (el.textContent || '').trim()
        return t === String(pag + 1) || t.toLowerCase().includes('siguiente') || t === '>' || t === '>>'
      })
    }, pagina)

    if (!hayNext) break

    const nextEl = await page.$(
      `a:text-is("${pagina + 1}"), button:text-is("${pagina + 1}"), ` +
      `a:has-text("Siguiente"), a:has-text(">"), span:has-text("Siguiente")`
    )
    if (!nextEl) break

    await nextEl.click()
    await page.waitForTimeout(2500)
    pagina++
    if (pagina > 30) break
  }

  return todas
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
      const context  = await browser.newContext()
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

        let navegoLibro = false

        // Estrategia 1: encontrar la fila que contiene el nro de expediente y hacer click en su dropdown
        try {
          // Buscar celda con el número de expediente exacto
          const fila$ = await page.locator(`td:text-is("${fila.nro}")`).first()
          if (await fila$.isVisible({ timeout: 3000 })) {
            const fila$row = fila$.locator('xpath=ancestor::tr[1]')
            const dropBtn  = fila$row.locator('button.dropdown-toggle, button[data-toggle="dropdown"], .btn-group > button:last-child, td:last-child button').first()
            if (await dropBtn.isVisible({ timeout: 2000 })) {
              await dropBtn.click()
              await page.waitForTimeout(800)
              const libroLink = page.locator('a:text("Libro digital"), li:text("Libro digital") a, a[href*="libroDigital"]').first()
              if (await libroLink.isVisible({ timeout: 2000 })) {
                await libroLink.click()
                await page.waitForURL('**/libroDigital.seam**', { timeout: 15000 }).catch(() => {})
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
                navegoLibro = page.url().includes('libroDigital.seam')
              }
            }
          }
        } catch (_) {}

        // Estrategia 2: índice basado en el orden de la tabla
        if (!navegoLibro) {
          console.log(`    🔽 Fallback: dropdown por índice ${idx}`)
          const dropdownBtns = await page.$$('button.dropdown-toggle, button[data-toggle="dropdown"], .btn-group button:last-child, td:last-child button')
          console.log(`       Botones encontrados: ${dropdownBtns.length}`)
          if (dropdownBtns[idx]) {
            await dropdownBtns[idx].click()
            await page.waitForTimeout(800)
            const libroLink = await page.$('a:has-text("Libro digital"), li:has-text("Libro digital") a, a[href*="libroDigital"]')
            if (libroLink) {
              await libroLink.click()
              await page.waitForURL('**/libroDigital.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              navegoLibro = page.url().includes('libroDigital.seam')
            }
          }
        }

        // Estrategia 3: link directo en la página
        if (!navegoLibro) {
          const libroDirecto = await page.$(`a[href*="libroDigital"]`)
          if (libroDirecto) {
            await libroDirecto.click()
            await page.waitForURL('**/libroDigital.seam**', { timeout: 15000 }).catch(() => {})
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
            navegoLibro = page.url().includes('libroDigital.seam')
          }
        }

        if (!navegoLibro) {
          console.log(`    ⚠️  No se pudo abrir Libro Digital. URL: ${page.url()}`)
          continue
        }

        console.log(`    🔗 ${page.url()}`)

        // Extraer y guardar actuaciones
        try {
          const acts   = await extraerActuacionesLibroDigital(page, fila.nro)
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
