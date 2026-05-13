/**
 * Script de exploración del PJN
 * Corre con: node scripts/pjn-explore.mjs
 */

import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

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

const env  = loadEnv()
const CUIT = process.env.PJN_CUIT     || env.PJN_CUIT
const PASS = process.env.PJN_PASSWORD  || env.PJN_PASSWORD

if (!CUIT || !PASS) {
  console.error('❌ Faltan credenciales en .env.local')
  process.exit(1)
}

console.log(`🔐 CUIT: ${CUIT}`)

const browser = await chromium.launch({ headless: false, slowMo: 500 })
const context = await browser.newContext()
const page    = await context.newPage()

// Capturar todas las requests para entender la API
const requests = []
page.on('request', req => {
  if (!req.url().includes('favicon') && !req.url().includes('.png') && !req.url().includes('.css')) {
    requests.push({ method: req.method(), url: req.url() })
  }
})

try {
  // ── 1. Ir al portal ────────────────────────────────────────────
  console.log('\n📡 Navegando al portal PJN...')
  await page.goto('https://portalpjn.pjn.gov.ar', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('URL:', page.url())
  await page.screenshot({ path: join(__dir, 'pjn-01-portal.png') })

  // ── 2. Login con Keycloak/OpenID ───────────────────────────────
  console.log('\n🔑 Intentando login...')

  // Buscar campos de usuario y contraseña
  await page.waitForSelector('input[type="text"], input[name="username"], input[id="username"]', { timeout: 10000 })

  const usernameInput = await page.$('input[name="username"]') ||
                        await page.$('input[id="username"]') ||
                        await page.$('input[type="text"]')

  const passwordInput = await page.$('input[name="password"]') ||
                        await page.$('input[id="password"]') ||
                        await page.$('input[type="password"]')

  if (!usernameInput || !passwordInput) {
    console.log('❌ No se encontraron los campos de login')
    await page.screenshot({ path: join(__dir, 'pjn-login-not-found.png') })
  } else {
    console.log('✅ Campos de login encontrados')

    // Ver qué placeholder/label tienen
    const uName = await usernameInput.getAttribute('placeholder') || await usernameInput.getAttribute('name')
    const pName = await passwordInput.getAttribute('placeholder') || await passwordInput.getAttribute('name')
    console.log(`  Usuario: campo "${uName}"`)
    console.log(`  Password: campo "${pName}"`)

    await usernameInput.fill(CUIT)
    await passwordInput.fill(PASS)
    await page.screenshot({ path: join(__dir, 'pjn-02-login-filled.png') })

    // Submit
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]')
    if (submitBtn) {
      await submitBtn.click()
    } else {
      await passwordInput.press('Enter')
    }

    // Esperar navegación post-login
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    console.log('\n📍 URL post-login:', page.url())
    await page.screenshot({ path: join(__dir, 'pjn-03-post-login.png') })

    // ── 3. Explorar la página principal del usuario ─────────────
    console.log('\n🔍 Explorando página principal...')
    console.log('Título:', await page.title())

    // Buscar links de expedientes/causas
    const links = await page.$$eval('a', els =>
      els.map(a => ({ text: a.textContent?.trim().substring(0, 60), href: a.href }))
         .filter(l => l.text && l.href && l.href.startsWith('http'))
         .filter(l => /expediente|causa|actuaci|proceso|consulta|mis\s/i.test(l.text))
         .slice(0, 30)
    )
    console.log('\n🔗 Links relevantes:', JSON.stringify(links, null, 2))

    // Buscar menús / secciones
    const menus = await page.$$eval('nav a, .menu a, .sidebar a, li a', els =>
      els.map(a => ({ text: a.textContent?.trim().substring(0, 60), href: a.href }))
         .filter(l => l.text && l.href)
         .slice(0, 30)
    )
    console.log('\n📋 Menús:', JSON.stringify(menus, null, 2))

    // Esperar 90 segundos para exploración manual
    console.log('\n⏸️  Browser abierto 90 seg para exploración manual...')
    console.log('   Navegá a donde están tus expedientes y fijate la URL')
    await page.waitForTimeout(90000)

    // Screenshot final
    await page.screenshot({ path: join(__dir, 'pjn-04-final.png') })
    console.log('\n📍 URL final:', page.url())
  }

  // Guardar requests capturadas
  writeFileSync(join(__dir, 'pjn-requests.json'), JSON.stringify(requests.slice(0, 100), null, 2))
  console.log(`\n📊 ${requests.length} requests capturadas → scripts/pjn-requests.json`)

} catch (err) {
  console.error('\n❌ Error:', err.message)
  await page.screenshot({ path: join(__dir, 'pjn-error.png') }).catch(() => {})
} finally {
  await browser.close()
  console.log('\n✅ Browser cerrado')
}
