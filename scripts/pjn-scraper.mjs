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

const env            = loadEnv()
const DATABASE_URL   = process.env.DATABASE_URL   || env.DATABASE_URL
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY

if (!DATABASE_URL)   { console.error('❌ DATABASE_URL no configurado'); process.exit(1) }
if (!ENCRYPTION_KEY) { console.error('❌ ENCRYPTION_KEY no configurado'); process.exit(1) }

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

// ── Extraer actuaciones del Libro Digital ─────────────────────────
// Estructura JSF/RichFaces: panel izquierdo con lista de actuaciones
// Cada item tiene: fecha (dd/mm/yyyy), letra tipo (badge/span), descripción, fojas
async function extraerActuacionesLibroDigital(page) {
  const todas  = []
  let   pagina = 1

  while (true) {
    console.log(`      📄 Página ${pagina}...`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Loguear estructura del DOM para debug (solo primera página)
    if (pagina === 1) {
      const htmlSnip = await page.evaluate(() => {
        // Buscar el panel izquierdo de actuaciones
        const body = document.body.innerHTML
        const idx  = body.toLowerCase().indexOf('actuaci')
        return idx > -1 ? body.substring(Math.max(0, idx - 200), idx + 800) : body.substring(0, 1000)
      })
      console.log(`      🔍 HTML snippet: ${htmlSnip.substring(0, 600)}`)
    }

    const items = await page.evaluate(() => {
      const resultado = []

      // Selectores en orden de especificidad (PJN usa RichFaces/JSF)
      const selectors = [
        // Selectores específicos del PJN Libro Digital
        '.rich-table-row',
        '.actuacion',
        '[id*="actuacion"]',
        '[class*="actuacion"]',
        // Panel izquierdo genérico
        '.panel-left tr',
        '.left-panel tr',
        // Tabla genérica
        'table tr',
        // Lista
        'ul li',
        '.list-group-item',
      ]

      let items = []
      for (const sel of selectors) {
        const found = [...document.querySelectorAll(sel)]
        // Filtrar items que tengan una fecha (dd/mm/yyyy) en su texto
        const conFecha = found.filter(el => /\d{2}\/\d{2}\/\d{4}/.test(el.textContent || ''))
        if (conFecha.length > 0) {
          items = conFecha
          break
        }
      }

      // Fallback: parsear todo el body buscando bloques con fecha
      if (items.length === 0) {
        const allEls = [...document.querySelectorAll('div, td, li, span')]
        items = allEls.filter(el => {
          const t = el.textContent || ''
          return /\d{2}\/\d{2}\/\d{4}/.test(t) && t.length > 15 && t.length < 2000
          && !el.querySelector('div, td, li') // leaf nodes preferidos
        })
      }

      for (const item of items) {
        const texto  = (item.innerText || item.textContent || '').trim()
        if (!texto || texto.length < 5) continue

        const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/)
        if (!fechaMatch) continue
        const fecha = fechaMatch[1]

        const fojasMatch = texto.match(/fs\.\s*([\d\s\/]+)/i) || texto.match(/foja[s]?\s+([\d\s\/]+)/i)
        const fojas      = fojasMatch ? fojasMatch[1].trim() : ''

        // Tipo: buscar badge/círculo (letra sola)
        const badgeEl = item.querySelector('[class*="badge"], [class*="circle"], [class*="tipo"], [class*="label"]')
        const tipo     = badgeEl?.textContent?.trim().substring(0, 10) || ''

        // Descripción: texto sin fecha ni fojas
        const lineas = texto.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean)
        const desc   = lineas
          .filter(l =>
            !l.match(/^\d{2}\/\d{2}\/\d{4}$/) &&
            !l.match(/^fs\./i) &&
            !l.match(/^foja/i) &&
            l.length > 2
          )
          .join(' ')
          .trim()
          .substring(0, 900)

        if (fecha && desc) {
          resultado.push({ fecha, tipo, descripcion: desc, fojas })
        }
      }

      // Deduplicar por fecha+descripcion
      const seen = new Set()
      return resultado.filter(r => {
        const k = `${r.fecha}|${r.descripcion.substring(0,80)}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    })

    console.log(`         ${items.length} actuaciones encontradas`)

    if (items.length === 0 && pagina === 1) {
      const texto = await page.evaluate(() => document.body.innerText)
      console.log(`         Texto body (primeros 800): ${texto.substring(0, 800)}`)
    }

    todas.push(...items)

    // Paginación — PJN usa links con números o "Siguiente >"
    const hayNext = await page.evaluate((pag) => {
      const candidates = [...document.querySelectorAll('a, button, span[onclick], td[onclick]')]
      return candidates.some(el => {
        const t = (el.textContent || '').trim()
        return t === String(pag + 1) ||
               t.toLowerCase().includes('siguiente') ||
               t === '>' || t === '>>'
      })
    }, pagina)

    if (!hayNext) break

    // Click en el elemento de paginación
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

    if (exists.length === 0) {
      await dbQuery(`
        INSERT INTO pjn_actuaciones (id_pjn_expediente, fecha, tipo, detalle, fojas)
        VALUES (${idPjnExp}, '${fechaISO}', '${tipoEsc}', '${detEsc}', '${fojEsc}')
      `)
      nuevas++

      // Si hay caso interno vinculado, agregar movimiento
      const expRow = await dbQuery(`SELECT id_caso FROM pjn_expedientes WHERE id = ${idPjnExp}`)
      if (expRow[0]?.id_caso) {
        const idCaso = expRow[0].id_caso
        await dbQuery(`
          INSERT INTO movimientos (id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion, id_usuario_registro)
          VALUES (${idCaso}, '${fechaISO}', '${tipoEsc}', '${detEsc.substring(0,199)}', 'Sincronizado desde PJN', 1)
        `).catch(e => console.warn(`      ⚠️  Mov interno: ${e.message}`))
      }
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
          const acts   = await extraerActuacionesLibroDigital(page)
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
