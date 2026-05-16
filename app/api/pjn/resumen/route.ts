import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPjnActuaciones, getPjnExpedientes } from '@/lib/queries'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const idExpediente = Number(searchParams.get('id'))
  const nro          = searchParams.get('nro') ?? ''
  const caratula     = searchParams.get('caratula') ?? ''
  if (!idExpediente) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurado' }, { status: 503 })
  }

  // Verificar si hay resumen pre-generado en la DB
  const expedientes = await getPjnExpedientes(session.user?.email ?? '')
  const expediente  = expedientes.find(e => e.id === idExpediente)
  if (expediente?.resumenIa) {
    return NextResponse.json({ resumen: expediente.resumenIa, cached: true })
  }

  const actuaciones = await getPjnActuaciones(idExpediente)
  if (actuaciones.length === 0) {
    return NextResponse.json({ resumen: 'Sin actuaciones registradas para resumir.' })
  }

  // Construir texto de actuaciones para el prompt (incluye texto extraído si disponible)
  const actsTexto = actuaciones
    .slice()
    .reverse()
    .map(a => {
      const base = `• ${a.fecha}  [${a.tipo}]  ${a.detalle}`
      return a.textoExtraido ? `${base}\n  Contenido: ${a.textoExtraido.substring(0, 500)}` : base
    })
    .join('\n')

  const prompt = `Sos un asistente jurídico argentino. Te doy las actuaciones de un expediente judicial y necesito que hagas un resumen ejecutivo breve (máximo 120 palabras) en español, dirigido al abogado del caso.

Expediente: ${nro}
Carátula: ${caratula}

Actuaciones (cronológicas):
${actsTexto}

Instrucciones:
- Explicá de qué trata el caso en 1-2 oraciones.
- Mencioná los hitos procesales más importantes.
- Indicá el estado actual del expediente.
- Usá lenguaje claro, sin jerga innecesaria.
- No uses bullets, escribí en prosa.
- Máximo 120 palabras.`

  // Streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stream = await anthropic.messages.stream({
          model:      'claude-opus-4-5',
          max_tokens: 300,
          messages:   [{ role: 'user', content: prompt }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error generando resumen'
        controller.enqueue(encoder.encode(`\n\nError: ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
