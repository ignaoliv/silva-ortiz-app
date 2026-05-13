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
  return (s || '').replace(/'/g, "''").substring(0, max)
}

// ── Extraer actuaciones del innerText de la página de detalle ─────
function extraerActuaciones(texto) {
  const lineas    = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const resultado = []
  let actual      = null

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]
    if (l === 'Oficina:') {
      if (actual) resultado.push(actual)
      actual = { oficina: lineas[i+1] || '', fecha: null, tipo: '', detalle: '', fojas: '' }
      i++
    } else if (l === 'Fecha:' && actual) {
      actual.fecha = parseDate(lineas[i+1] || '')
      i++
    } else if (l === 'Tipo actuacion:' && actual) {
      actual.tipo = lineas[i+1] || ''
      i++
    } else if (l === 'Detalle:' && actual) {
      actual.detalle = lineas[i+1] || ''
      i++
    } else if (actual && /^\d+ \/ \d+$/.test(l)) {
      actual.fojas = l
    }
  }
  if (actual) resultado.push(actual)
  return resultado.filter(a => a.tipo && a.detalle)
}

// ── Scrape todas las actuaciones de un expediente (con paginación) ─
async function scrapeActuaciones(page) {
  const todas = []
  let pagina  = 1

  while (true) {
    console.log(`      📄 Pág. ${pagina}...`)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const texto = await page.evaluate(() => document.body.innerText)
    const acts  = extraerActuaciones(texto)
    todas.push(...acts)
    console.log(`         ${acts.length} actuaciones encontradas`)

    // Paginación: buscar link numérico siguiente
    const siguiente = await page.evaluate((pag) => {
      const links = [...document.querySelectorAll('a')]
      const next  = links.find(a => a.textContent.trim() === String(pag + 1))
      return next ? next.id || next.getAttribute('onclick') || '__click__' : null
    }, pagina)

    if (!siguiente) break

    // Hacer click en el link de siguiente página
    const nextLink = await page.$(`a:text-is("${pagina + 1}")`)
    if (!nextLink) break
    await nextLink.click()
    pagina++
    await page.waitForTimeout(1500)

    if (pagina > 20) break
  }

  return todas
}

// ── Guardar actuaciones en DB ─────────────────────────────────────
async function guardarActuaciones(idPjnExp, actuaciones) {
  let nuevas = 0
  for (const a of actuaciones) {
    if (!a.fecha || !a.tipo || !a.detalle) continue

    const detEsc  = esc(a.detalle, 999)
    const tipoEsc = esc(a.tipo, 99)
    const ofEsc   = esc(a.oficina, 19)
    const fojEsc  = esc(a.fojas, 49)

    const exists = await dbQuery(`
      SELECT 1 FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
        AND fecha   = '${a.fecha}'
        AND tipo    = '${tipoEsc}'
        AND detalle = '${detEsc}'
    `)

    if (exists.length === 0) {
      await dbQuery(`
        INSERT INTO pjn_actuaciones (id_pjn_expediente, oficina, fecha, tipo, detalle, fojas)
        VALUES (${idPjnExp}, '${ofEsc}', '${a.fecha}', '${tipoEsc}', '${detEsc}', '${fojEsc}')
      `)
      nuevas++

      // Si hay caso interno vinculado, agregar movimiento
      const expRow = await dbQuery(`SELECT id_caso FROM pjn_expedientes WHERE id = ${idPjnExp}`)
      if (expRow[0]?.id_caso) {
        const idCaso = expRow[0].id_caso
        await dbQuery(`
          INSERT INTO movimientos (id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion, id_usuario_registro)
          VALUES (${idCaso}, '${a.fecha}', '${tipoEsc}', '${detEsc.substring(0,199)}', 'Sincronizado desde PJN', 1)
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

      // ── 2. Ir a mis expedientes como LETRADO ─────────────────
      await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
        waitUntil: 'networkidle', timeout: 30000
      })

      // Click LETRADO
      const letradoBtn = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
      if (letradoBtn) {
        await letradoBtn.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
        console.log('  ✅ Filtro LETRADO')
      }

      // ── 3. Extraer filas de la tabla ─────────────────────────
      // Cada fila tiene: Expediente | Dependencia | Carátula | Situación | Últ.Act. | botón ver
      const filas = await page.evaluate(() => {
        const rows = []
        // La tabla tiene celdas con el nro de expediente (formato: AAA 000000/0000)
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

      // ── 4. Para cada expediente, hacer click en el ojo 👁 ────
      for (let idx = 0; idx < filas.length; idx++) {
        const fila = filas[idx]
        console.log(`\n  📂 [${idx+1}/${filas.length}] ${fila.nro} — ${fila.caratula.substring(0,50)}`)

        // Buscar caso interno por nro expediente
        const nroEsc   = esc(fila.nro, 49)
        const emailEsc = esc(email)
        const casoInt  = await dbQuery(`SELECT id_caso FROM casos WHERE nro_expediente = '${nroEsc}' AND activo = 1`).catch(() => [])
        const idCaso   = casoInt[0]?.id_caso || null

        // Upsert en pjn_expedientes
        await dbQuery(`
          MERGE pjn_expedientes AS t
          USING (SELECT '${emailEsc}' AS e, '${nroEsc}' AS n) AS s ON t.email_usuario=s.e AND t.nro_expediente=s.n
          WHEN MATCHED THEN UPDATE SET
            caratula='${esc(fila.caratula)}', dependencia='${esc(fila.dependencia)}',
            situacion='${esc(fila.situacion,99)}', ultima_act=${fila.ultima_act ? `'${parseDate(fila.ultima_act)}'` : 'NULL'},
            id_caso=${idCaso ?? 'NULL'}, fecha_sync=GETDATE()
          WHEN NOT MATCHED THEN INSERT (email_usuario,nro_expediente,caratula,dependencia,situacion,ultima_act,id_caso)
          VALUES ('${emailEsc}','${nroEsc}','${esc(fila.caratula)}','${esc(fila.dependencia)}',
                  '${esc(fila.situacion,99)}',${fila.ultima_act ? `'${parseDate(fila.ultima_act)}'` : 'NULL'},${idCaso ?? 'NULL'});
        `)

        const idRow = await dbQuery(`SELECT id FROM pjn_expedientes WHERE email_usuario='${emailEsc}' AND nro_expediente='${nroEsc}'`)
        const idPjnExp = idRow[0]?.id
        if (!idPjnExp) continue

        // Volver a la lista y hacer click en el link del expediente
        await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
          waitUntil: 'networkidle', timeout: 30000
        })
        const letBtn2 = await page.$('input[value="LETRADO"], button:has-text("LETRADO")')
        if (letBtn2) { await letBtn2.click(); await page.waitForLoadState('networkidle', { timeout: 15000 }) }

        // Hacer click en el link "visualizar expediente" del idx-ésimo expediente
        const verLinks = await page.$$('a:has-text("visualizar expediente"), a[title*="visualizar"], td a[href*="#"]')
        // Alternativa: buscar links que naveguen al expediente
        const expLinks = await page.$$eval('a', as =>
          as.filter(a => a.textContent.trim().toLowerCase().includes('visualizar') ||
                         a.getAttribute('onclick')?.includes('expediente'))
            .map((a, i) => i)
        )

        // Click en el link del expediente correspondiente por posición
        const todosLinks = await page.$$('a[href*="consultaListaRelacionados.seam#"]')
        // Encontrar el que corresponde a este expediente (primer link de la fila)
        let clickeado = false
        for (const link of todosLinks) {
          const txt = await link.textContent()
          if (txt.trim().toLowerCase().includes('visualizar')) {
            const filaLinks = await page.$$('a[href*="consultaListaRelacionados.seam#"]:has-text("visualizar")')
            if (filaLinks[idx]) {
              await filaLinks[idx].click()
              await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
              await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
              clickeado = true
              break
            }
          }
        }

        if (!clickeado) {
          // Fallback: usar el ojo (img) de la fila
          const ojoLinks = await page.$$('a:has(img), a.btn-visualizar, a[title*="Ver"]')
          if (ojoLinks[idx]) {
            await ojoLinks[idx].click()
            await page.waitForURL('**/expediente.seam**', { timeout: 15000 }).catch(() => {})
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
            clickeado = true
          }
        }

        if (!page.url().includes('expediente.seam')) {
          console.log(`    ⚠️  No se pudo navegar al detalle`)
          continue
        }

        console.log(`    🔗 ${page.url()}`)

        // Scrape actuaciones
        try {
          const acts   = await scrapeActuaciones(page)
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
