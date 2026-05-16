/**
 * Webhook receiver para el Apify actor de PJN
 * El actor llama este endpoint al terminar, pasando el resumen del run
 */
import { NextRequest, NextResponse } from 'next/server'

const CALLBACK_SECRET = process.env.PJN_CALLBACK_SECRET ?? 'silva-ortiz-pjn-2026'

export async function POST(req: NextRequest) {
  // Verificación básica por token en header o query
  const secret =
    req.headers.get('x-callback-secret') ??
    req.nextUrl.searchParams.get('secret')

  if (secret !== CALLBACK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* vacío */ }

  console.log('[pjn-callback] Apify actor completado:', JSON.stringify(body))

  return NextResponse.json({ ok: true })
}
