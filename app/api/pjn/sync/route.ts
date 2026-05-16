import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPjnUserStatus } from '@/lib/queries'
import { spawn } from 'child_process'
import path from 'path'

const APIFY_TOKEN      = process.env.APIFY_TOKEN
const APIFY_ACTOR_ID   = 'vHYcE77oTALF2YfMp'  // haywire_honeylocust/pjn-scraper-silva-ortiz
const CALLBACK_SECRET  = process.env.PJN_CALLBACK_SECRET ?? 'silva-ortiz-pjn-2026'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Si ya hay una sync corriendo, no lanzar otra
  const status = await getPjnUserStatus(session.user.email)
  if (status.sincronizando) {
    return NextResponse.json({ started: false, reason: 'Ya hay una sincronización en curso.' })
  }

  // ── Intento 1: scraper local ────────────────────────────────────
  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'pjn-scraper.mjs')
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio:    'ignore',
      env: {
        ...process.env,
        PJN_EMAIL_FILTER: session.user.email,
      },
    })
    child.unref()
    console.log('[pjn-sync] Scraper local iniciado')
    return NextResponse.json({ started: true, engine: 'local' })
  } catch (localErr) {
    console.warn('[pjn-sync] Scraper local falló, usando Apify:', (localErr as Error).message)
  }

  // ── Intento 2: Apify con proxy residencial AR ──────────────────
  if (!APIFY_TOKEN) {
    return NextResponse.json({ started: false, reason: 'Sin scraper disponible — APIFY_TOKEN no configurado' }, { status: 500 })
  }

  try {
    const callbackUrl = `${process.env.NEXTAUTH_URL ?? ''}/api/pjn/sync-callback?secret=${CALLBACK_SECRET}`

    const res = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DATABASE_URL:           process.env.DATABASE_URL,
          ENCRYPTION_KEY:         process.env.ENCRYPTION_KEY,
          AZURE_STORAGE_CONN_STR: process.env.AZURE_STORAGE_CONN_STR,
          CALLBACK_URL:           callbackUrl,
        }),
      }
    )

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Apify respondió ${res.status}: ${txt.substring(0, 200)}`)
    }

    const data = await res.json()
    console.log('[pjn-sync] Apify run iniciado:', data?.data?.id)
    return NextResponse.json({ started: true, engine: 'apify', runId: data?.data?.id })

  } catch (apifyErr) {
    console.error('[pjn-sync] Apify también falló:', (apifyErr as Error).message)
    return NextResponse.json({ started: false, reason: 'No se pudo iniciar la sincronización' }, { status: 500 })
  }
}
