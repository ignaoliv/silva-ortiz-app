import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlantilla, getCasoParaDocumento } from '@/lib/queries'
import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  HeadingLevel,
  AlignmentType,
} from 'docx'

const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function fechaHoy(): string {
  const d = new Date()
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`
}

function applyPlaceholders(
  contenido: string,
  vars: Record<string, string>
): string {
  let result = contenido
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value)
  }
  return result
}

/** Extrae runs de un fragmento de HTML simplificado */
function parseInlineRuns(html: string): TextRun[] {
  // Strip any remaining tags not handled, get text with basic bold/italic
  const runs: TextRun[] = []

  // Replace <strong>/<b> and <em>/<i> with markers, then split
  const processed = html
    .replace(/<strong>(.*?)<\/strong>/gi, '[[B]]$1[[/B]]')
    .replace(/<b>(.*?)<\/b>/gi, '[[B]]$1[[/B]]')
    .replace(/<em>(.*?)<\/em>/gi, '[[I]]$1[[/I]]')
    .replace(/<i>(.*?)<\/i>/gi, '[[I]]$1[[/I]]')
    .replace(/<[^>]+>/g, '') // strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')

  // Simple tokenizer
  const parts = processed.split(/(\[\[B\]\]|\[\[\/B\]\]|\[\[I\]\]|\[\[\/I\]\])/)
  let bold = false
  let italic = false
  for (const part of parts) {
    if (part === '[[B]]')  { bold   = true;  continue }
    if (part === '[[/B]]') { bold   = false; continue }
    if (part === '[[I]]')  { italic = true;  continue }
    if (part === '[[/I]]') { italic = false; continue }
    if (part) {
      runs.push(new TextRun({ text: part, bold, italics: italic, font: 'Calibri', size: 24 }))
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: '', font: 'Calibri', size: 24 }))
  }
  return runs
}

function htmlToParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Split by block-level tags
  const blocks = html
    .replace(/<\/p>/gi, '</p>\n')
    .replace(/<\/h[1-6]>/gi, (m) => m + '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Calibri', size: 24 })] }))
      continue
    }

    // Check if heading
    const h2Match = trimmed.match(/^<h2[^>]*>(.*?)<\/h2>/i)
    if (h2Match) {
      const runs = parseInlineRuns(h2Match[1])
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs }))
      continue
    }

    // Check if list item
    const liMatch = trimmed.match(/^<li[^>]*>(.*?)<\/li>/i)
    if (liMatch) {
      const runs = parseInlineRuns(liMatch[1])
      paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: runs }))
      continue
    }

    // Regular paragraph — strip outer <p> tags
    const pContent = trimmed.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '')
    if (pContent) {
      const runs = parseInlineRuns(pContent)
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: runs,
        spacing: { after: 120 },
      }))
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Calibri', size: 24 })] }))
  }

  return paragraphs
}

// POST /api/plantillas/[id]/generar
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const { id } = await params
    const { casoId } = await req.json() as { casoId: number }

    if (!casoId) {
      return NextResponse.json({ error: 'casoId es obligatorio.' }, { status: 400 })
    }

    const [plantilla, caso] = await Promise.all([
      getPlantilla(Number(id)),
      getCasoParaDocumento(casoId),
    ])

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 })
    }
    if (!caso) {
      return NextResponse.json({ error: 'Expediente no encontrado.' }, { status: 404 })
    }

    // Replace placeholders
    const vars: Record<string, string> = {
      caratula:           caso.caratula           ?? '',
      nroExpediente:      caso.nroExpediente       ?? '',
      juzgado:            caso.juzgado             ?? '',
      fuero:              caso.fuero               ?? '',
      cliente:            caso.cliente             ?? '',
      abogadoResponsable: caso.abogadoResponsable  ?? '',
      fechaHoy:           fechaHoy(),
    }

    const contenidoFinal = applyPlaceholders(plantilla.contenido, vars)

    // Convert HTML to docx paragraphs
    const paragraphs = htmlToParagraphs(contenidoFinal)

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 24 },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top:    1440, // 2.54cm in twips (1 inch)
              bottom: 1440,
              left:   1440,
              right:  1440,
            },
          },
        },
        children: paragraphs,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    const nombreArchivo = `${plantilla.nombre.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'documento'}.docx`

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    })
  } catch (err) {
    console.error('[plantillas/:id/generar POST]', err)
    return NextResponse.json({ error: 'Error al generar el documento.' }, { status: 500 })
  }
}
