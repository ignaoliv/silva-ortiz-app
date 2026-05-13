/**
 * PJN Scraper — Silva Ortiz
 *
 * Uso:
 *   node scripts/pjn-scraper.mjs
 *
 * Lee credenciales de la tabla pjn_credenciales de la DB.
 * Guarda expedientes y actuaciones en pjn_expedientes y pjn_actuaciones.
 */

import { chromium } from 'playwright'
import sql from 'mssql'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Env ──────────────────────────────────────────────────────────
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

// ── Crypto ───────────────────────────────────────────────────────
function decrypt(data) {
  const key   = Buffer.from(ENCRYPTION_KEY, 'hex')
  const [ivHex, tagHex, encHex] = data.split(':')
  const iv        = Buffer.from(ivHex, 'hex')
  const tag       = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher  = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

// ── DB ───────────────────────────────────────────────────────────
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

// ── Parsear fecha dd/mm/yyyy → yyyy-mm-dd ─────────────────────────
function parseDate(str) {
  if (!str) return null
  const [d, m, y] = str.trim().split('/')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
}

// ── Scraper de un expediente ──────────────────────────────────────
async function scrapeExpediente(page, url, idPjnExp) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

  const actuaciones = []
  let pagina = 1
  let hayMas = true

  while (hayMas) {
    console.log(`    📄 Página ${pagina}...`)
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    const html  = await page.content()
    const rows  = await page.$$eval(
      'table tbody tr, .actuaciones-row, [class*="actuacion"]',
      trs => trs.map(tr => ({
        cells: [...tr.querySelectorAll('td')].map(td => td.innerText.trim()),
        links: [...tr.querySelectorAll('a')].map(a => ({ text: a.innerText.trim(), href: a.href }))
      })).filter(r => r.cells.length > 0)
    ).catch(() => [])

    // Intentar extraer actuaciones con estructura conocida del PJN
    // La página usa labels: "Oficina:", "Fecha:", "Tipo actuacion:", "Detalle:"
    const oficinas = await page.$$eval('[id*="oficina"], td:has-text("Oficina:")', els =>
      els.map(el => el.nextSibling?.textContent?.trim() || el.parentElement?.nextElementSibling?.textContent?.trim()).filter(Boolean)
    ).catch(() => [])

    // Extraer por texto de la página
    const bodyText = await page.evaluate(() => document.body.innerText)
    const bloques  = extraerActuaciones(bodyText)

    for (const b of bloques) {
      actuaciones.push(b)
    }

    // Ver si hay siguiente página
    const nextBtn = await page.$('a[id*="next"], a:has-text("Siguiente"), a:has-text("»")')
    if (nextBtn) {
      await nextBtn.click()
      pagina++
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    } else {
      // Buscar links de paginación numérica
      const paginaLinks = await page.$$eval('a', as =>
        as.filter(a => /^\d+$/.test(a.textContent.trim()) && parseInt(a.textContent.trim()) > 1)
          .map(a => ({ num: parseInt(a.textContent.trim()), href: a.href }))
      ).catch(() => [])

      const siguiente = paginaLinks.find(p => p.num === pagina + 1)
      if (siguiente) {
        await page.goto(siguiente.href, { waitUntil: 'domcontentloaded', timeout: 30000 })
        pagina++
      } else {
        hayMas = false
      }
    }

    if (pagina > 20) break // safety limit
  }

  return actuaciones
}

// ── Extraer actuaciones del texto de la página ────────────────────
function extraerActuaciones(texto) {
  const lineas    = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const resultado = []
  let actual      = null

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i]

    if (l === 'Oficina:') {
      if (actual) resultado.push(actual)
      actual = { oficina: '', fecha: null, tipo: '', detalle: '', fojas: '' }
      actual.oficina = lineas[i + 1] || ''
      i++
    } else if (l === 'Fecha:' && actual) {
      actual.fecha = parseDate(lineas[i + 1] || '')
      i++
    } else if (l === 'Tipo actuacion:' && actual) {
      actual.tipo = lineas[i + 1] || ''
      i++
    } else if (l === 'Detalle:' && actual) {
      actual.detalle = lineas[i + 1] || ''
      i++
    } else if (actual && /^\d+ \/ \d+$/.test(l)) {
      actual.fojas = l
    }
  }

  if (actual) resultado.push(actual)
  return resultado.filter(a => a.tipo && a.detalle)
}

// ── Guardar actuaciones en DB ─────────────────────────────────────
async function guardarActuaciones(idPjnExp, actuaciones) {
  let nuevas = 0
  for (const a of actuaciones) {
    if (!a.fecha || !a.tipo || !a.detalle) continue
    const detEsc  = (a.detalle || '').replace(/'/g, "''").substring(0, 999)
    const tipoEsc = (a.tipo    || '').replace(/'/g, "''").substring(0, 99)
    const ofEsc   = (a.oficina || '').replace(/'/g, "''").substring(0, 19)
    const fojEsc  = (a.fojas   || '').replace(/'/g, "''").substring(0, 49)

    const exists = await dbQuery(`
      SELECT 1 FROM pjn_actuaciones
      WHERE id_pjn_expediente = ${idPjnExp}
        AND fecha = '${a.fecha}'
        AND tipo  = '${tipoEsc}'
        AND detalle = '${detEsc}'
    `)

    if (exists.length === 0) {
      await dbQuery(`
        INSERT INTO pjn_actuaciones (id_pjn_expediente, oficina, fecha, tipo, detalle, fojas)
        VALUES (${idPjnExp}, '${ofEsc}', '${a.fecha}', '${tipoEsc}', '${detEsc}', '${fojEsc}')
      `)
      nuevas++

      // Si el expediente está vinculado a un caso interno, agregar movimiento
      const expRow = await dbQuery(`SELECT id_caso FROM pjn_expedientes WHERE id = ${idPjnExp}`)
      if (expRow[0]?.id_caso) {
        const idCaso   = expRow[0].id_caso
        const tipoMov  = tipoEsc.substring(0, 99)
        const titulo   = detEsc.substring(0, 199)
        await dbQuery(`
          INSERT INTO movimientos (id_caso, fecha_movimiento, tipo_movimiento, titulo, descripcion, id_usuario_registro)
          VALUES (${idCaso}, '${a.fecha}', '${tipoMov}', '${titulo}', 'Sincronizado desde PJN', 1)
        `).catch(e => console.warn('    ⚠️  No se pudo agregar movimiento interno:', e.message))
      }
    }
  }
  return nuevas
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 PJN Scraper iniciado —', new Date().toLocaleString('es-AR'))

  const p = await getPool()

  // Obtener todos los usuarios con credenciales PJN
  const credenciales = await dbQuery(`SELECT email_usuario, pjn_cuit, pjn_password_enc FROM pjn_credenciales`)

  if (credenciales.length === 0) {
    console.log('⚠️  No hay credenciales PJN configuradas')
    process.exit(0)
  }

  console.log(`👥 ${credenciales.length} usuario(s) a sincronizar`)

  const browser = await chromium.launch({ headless: true })

  for (const cred of credenciales) {
    const email = cred.email_usuario
    console.log(`\n👤 Procesando: ${email}`)

    // Log inicio
    const logRes = await dbQuery(`
      INSERT INTO pjn_sync_log (email_usuario) OUTPUT INSERTED.id VALUES ('${email}')
    `)
    const logId = logRes[0]?.id

    let expCount = 0
    let actCount = 0

    try {
      const cuit     = cred.pjn_cuit
      const password = decrypt(cred.pjn_password_enc)

      const context = await browser.newContext()
      const page    = await context.newPage()

      // ── 1. Login ─────────────────────────────────────────────
      console.log('  🔐 Iniciando sesión...')
      await page.goto('https://portalpjn.pjn.gov.ar', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('input[name="username"]', { timeout: 10000 })
      await page.fill('input[name="username"]', cuit)
      await page.fill('input[name="password"]', password)
      await page.click('button[type="submit"], input[type="submit"]')
      await page.waitForLoadState('networkidle', { timeout: 20000 })

      if (page.url().includes('sso.pjn.gov.ar')) {
        throw new Error('Login fallido — credenciales incorrectas')
      }
      console.log('  ✅ Login exitoso')

      // ── 2. Ir a consultas ─────────────────────────────────────
      await page.goto('https://scw.pjn.gov.ar/scw/consultaListaRelacionados.seam', {
        waitUntil: 'networkidle', timeout: 30000
      })

      // Click en LETRADO para ver expedientes como abogado
      const letradoBtn = await page.$('button:has-text("LETRADO"), input[value="LETRADO"]')
      if (letradoBtn) {
        await letradoBtn.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
        console.log('  ✅ Filtro LETRADO aplicado')
      }

      // ── 3. Extraer lista de expedientes ───────────────────────
      console.log('  📋 Extrayendo lista de expedientes...')
      const bodyText = await page.evaluate(() => document.body.innerText)

      // Extraer expedientes de la lista
      const expedientesLinks = await page.$$eval('a[href*="expediente.seam"]', as =>
        as.map(a => ({ href: a.href, text: a.innerText.trim() }))
      ).catch(() => [])

      // Extraer datos de la tabla
      const expData = await page.evaluate(() => {
        const rows    = []
        const allText = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean)
        // Buscar pattern: número de expediente tipo "CCF 002729/2026"
        const expRegex = /^[A-Z]{2,4}\s+\d{6}\/\d{4}$/
        for (let i = 0; i < allText.length; i++) {
          if (expRegex.test(allText[i])) {
            rows.push({
              nro:          allText[i],
              dependencia:  allText[i + 1] || '',
              caratula:     allText[i + 2] || '',
              situacion:    allText[i + 3] || '',
              ultima_act:   allText[i + 4] || '',
            })
          }
        }
        return rows
      })

      console.log(`  📁 ${expData.length} expediente(s) encontrado(s)`)

      // ── 4. Procesar cada expediente ───────────────────────────
      for (let idx = 0; idx < expedientesLinks.length; idx++) {
        const link = expedientesLinks[idx]
        const exp  = expData[idx] || {}

        const nro        = exp.nro        || `EXP-${idx}`
        const caratula   = (exp.caratula  || '').replace(/'/g, "''").substring(0, 499)
        const dep        = (exp.dependencia || '').replace(/'/g, "''").substring(0, 254)
        const situacion  = (exp.situacion  || '').replace(/'/g, "''").substring(0, 99)
        const ultAct     = parseDate(exp.ultima_act)
        const urlDet     = (link.href || '').substring(0, 499)
        const emailEsc   = email.replace(/'/g, "''")
        const nroEsc     = nro.replace(/'/g, "''")

        console.log(`  📂 [${idx + 1}/${expedientesLinks.length}] ${nro} — ${caratula.substring(0, 50)}`)

        // Buscar si ya existe en nuestra DB interna (por nro_expediente)
        const casoInterno = await dbQuery(`
          SELECT id_caso FROM casos WHERE nro_expediente = '${nroEsc}' AND activo = 1
        `).catch(() => [])
        const idCaso = casoInterno[0]?.id_caso || null
        const idCasoStr = idCaso ? idCaso.toString() : 'NULL'

        // Upsert en pjn_expedientes
        await dbQuery(`
          MERGE pjn_expedientes AS t
          USING (SELECT '${emailEsc}' AS email_usuario, '${nroEsc}' AS nro_expediente) AS s
          ON t.email_usuario = s.email_usuario AND t.nro_expediente = s.nro_expediente
          WHEN MATCHED THEN UPDATE SET
            caratula   = '${caratula}',
            dependencia= '${dep}',
            situacion  = '${situacion}',
            ultima_act = ${ultAct ? `'${ultAct}'` : 'NULL'},
            url_detalle= '${urlDet}',
            id_caso    = ${idCasoStr},
            fecha_sync = GETDATE()
          WHEN NOT MATCHED THEN INSERT
            (email_usuario, nro_expediente, caratula, dependencia, situacion, ultima_act, url_detalle, id_caso)
          VALUES
            ('${emailEsc}', '${nroEsc}', '${caratula}', '${dep}', '${situacion}',
             ${ultAct ? `'${ultAct}'` : 'NULL'}, '${urlDet}', ${idCasoStr});
        `)

        const idPjnExpRow = await dbQuery(`
          SELECT id FROM pjn_expedientes WHERE email_usuario = '${emailEsc}' AND nro_expediente = '${nroEsc}'
        `)
        const idPjnExp = idPjnExpRow[0]?.id

        if (!idPjnExp) continue

        // Scrape actuaciones
        try {
          const actuaciones = await scrapeExpediente(page, link.href, idPjnExp)
          const nuevas      = await guardarActuaciones(idPjnExp, actuaciones)
          console.log(`    ✅ ${actuaciones.length} actuaciones, ${nuevas} nuevas`)
          actCount += nuevas
        } catch (e) {
          console.warn(`    ⚠️  Error scrapeando actuaciones: ${e.message}`)
        }

        expCount++
        // Pausa entre expedientes para no sobrecargar el servidor
        await page.waitForTimeout(1000)
      }

      await context.close()

      // Log éxito
      if (logId) {
        await dbQuery(`
          UPDATE pjn_sync_log SET
            fecha_fin       = GETDATE(),
            expedientes     = ${expCount},
            actuaciones_new = ${actCount},
            estado          = 'ok'
          WHERE id = ${logId}
        `)
      }
      console.log(`\n  ✅ Sincronización completa: ${expCount} exp, ${actCount} actuaciones nuevas`)

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`)
      if (logId) {
        const errEsc = err.message.replace(/'/g, "''").substring(0, 999)
        await dbQuery(`
          UPDATE pjn_sync_log SET fecha_fin = GETDATE(), estado = 'error', error = '${errEsc}'
          WHERE id = ${logId}
        `)
      }
    }
  }

  await browser.close()
  await pool.close()
  console.log('\n🏁 Scraper finalizado —', new Date().toLocaleString('es-AR'))
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
