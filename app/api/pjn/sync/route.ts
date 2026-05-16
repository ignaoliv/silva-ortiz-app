import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPjnUserStatus } from '@/lib/queries'
import { spawn } from 'child_process'
import path from 'path'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Si ya hay una sync corriendo, no lanzar otra
  const status = await getPjnUserStatus(session.user.email)
  if (status.sincronizando) {
    return NextResponse.json({ started: false, reason: 'Ya hay una sincronización en curso.' })
  }

  const scriptPath = path.resolve(process.cwd(), 'scripts', 'pjn-scraper.mjs')

  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio:    'ignore',
    env: {
      ...process.env,
      // Pasar solo el usuario actual como filtro si el scraper lo soporta
      PJN_EMAIL_FILTER: session.user.email,
    },
  })
  child.unref()

  return NextResponse.json({ started: true })
}
