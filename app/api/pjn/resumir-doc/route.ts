import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurado' }, { status: 503 })
  }

  const { blobUrl, titulo } = await req.json()
  if (!blobUrl) return NextResponse.json({ error: 'Falta blobUrl' }, { status: 400 })

  // Descargar el PDF desde Azure Blob
  let pdfBuffer: Buffer
  try {
    const res = await fetch(blobUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    pdfBuffer = Buffer.from(await res.arrayBuffer())
  } catch (e: unknown) {
    return NextResponse.json({ error: `No se pudo descargar el PDF: ${e instanceof Error ? e.message : e}` }, { status: 502 })
  }

  // Extraer texto del PDF
  let texto = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(pdfBuffer)
    texto = data.text?.trim() ?? ''
  } catch {
    texto = ''
  }

  if (!texto || texto.length < 30) {
    // PDF sin texto (escaneado) — informar al usuario
    return NextResponse.json({
      error: 'Este documento es una imagen escaneada y no contiene texto extraíble. No es posible resumirlo automáticamente.'
    }, { status: 422 })
  }

  // Truncar si es muy largo (Claude soporta mucho contexto, pero limitamos a ~12k chars)
  const textoTrunc = texto.length > 12000 ? texto.substring(0, 12000) + '\n\n[... documento truncado ...]' : texto

  const prompt = `Sos un asistente jurídico argentino. Leé el siguiente documento judicial y hacé un resumen ejecutivo conciso (máximo 150 palabras) en español, dirigido al abogado del caso.

Documento: "${titulo || 'Actuación judicial'}"

Contenido:
${textoTrunc}

Instrucciones:
- Identificá el tipo de documento y su propósito principal.
- Destacá los puntos clave (fechas, montos, partes, resoluciones, plazos).
- Si hay una acción requerida o plazo, marcalo claramente.
- Usá lenguaje claro y directo, sin jerga innecesaria.
- Máximo 150 palabras, en prosa continua.`

  // Streaming
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await anthropic.messages.stream({
          model:      'claude-opus-4-5',
          max_tokens: 400,
          messages:   [{ role: 'user', content: prompt }],
        })

        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (e: unknown) {
        controller.enqueue(encoder.encode(`\n\nError: ${e instanceof Error ? e.message : 'Error generando resumen'}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
