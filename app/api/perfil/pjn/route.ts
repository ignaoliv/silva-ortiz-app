import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rows = await query<{ pjn_cuit: string; pjn_password_enc: string }>(`
    SELECT pjn_cuit, pjn_password_enc
    FROM pjn_credenciales
    WHERE email_usuario = '${session.user.email}'
  `)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ cuit: '', hasPassword: false })
  }

  return NextResponse.json({
    cuit: rows[0].pjn_cuit,
    hasPassword: !!rows[0].pjn_password_enc,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { cuit, password } = await req.json()
  if (!cuit || !password) return NextResponse.json({ error: 'CUIT y contraseña requeridos' }, { status: 400 })

  const email      = session.user.email.replace(/'/g, "''")
  const cuitClean  = String(cuit).replace(/'/g, "''")
  const encrypted  = encrypt(password)
  const encEscaped = encrypted.replace(/'/g, "''")

  await query(`
    MERGE pjn_credenciales AS target
    USING (SELECT '${email}' AS email_usuario) AS source
    ON target.email_usuario = source.email_usuario
    WHEN MATCHED THEN
      UPDATE SET pjn_cuit = '${cuitClean}', pjn_password_enc = '${encEscaped}', fecha_actualizacion = GETDATE()
    WHEN NOT MATCHED THEN
      INSERT (email_usuario, pjn_cuit, pjn_password_enc)
      VALUES ('${email}', '${cuitClean}', '${encEscaped}');
  `)

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await query(`DELETE FROM pjn_credenciales WHERE email_usuario = '${session.user.email}'`)
  return NextResponse.json({ ok: true })
}
