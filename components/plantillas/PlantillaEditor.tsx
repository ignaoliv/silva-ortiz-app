'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, UnderlineIcon, Heading2,
  List, AlignLeft, AlignCenter, AlignRight, Trash2, Save,
} from 'lucide-react'
import type { DBPlantilla } from '@/lib/queries'
import { cn } from '@/lib/utils'

const CATEGORIAS = ['Escritos', 'Cartas Documento', 'Oficios', 'Demandas', 'Recursos', 'Otro']

const VARIABLES = [
  { label: 'Carátula',           value: '{{caratula}}'           },
  { label: 'Nro. Expediente',    value: '{{nroExpediente}}'      },
  { label: 'Juzgado',            value: '{{juzgado}}'            },
  { label: 'Fuero',              value: '{{fuero}}'              },
  { label: 'Cliente',            value: '{{cliente}}'            },
  { label: 'Abogado responsable',value: '{{abogadoResponsable}}' },
  { label: 'Fecha de hoy',       value: '{{fechaHoy}}'           },
]

interface Props {
  plantilla?: DBPlantilla
}

export default function PlantillaEditor({ plantilla }: Props) {
  const router  = useRouter()
  const isEdit  = Boolean(plantilla)

  const [nombre,    setNombre]    = useState(plantilla?.nombre    ?? '')
  const [categoria, setCategoria] = useState(plantilla?.categoria ?? '')
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Escribí el contenido de la plantilla…' }),
    ],
    content: plantilla?.contenido ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[400px] px-4 py-3 text-so-text text-sm leading-relaxed',
      },
    },
  })

  const insertVariable = useCallback((value: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(value).run()
  }, [editor])

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    const contenido = editor?.getHTML() ?? ''
    if (!contenido.trim() || contenido === '<p></p>') { setError('El contenido es obligatorio.'); return }

    setSaving(true)
    setError(null)
    try {
      const url    = isEdit ? `/api/plantillas/${plantilla!.id}` : '/api/plantillas'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), categoria: categoria || undefined, contenido }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar.'); return }
      router.push('/plantillas')
      router.refresh()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!plantilla) return
    if (!confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/plantillas/${plantilla.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/plantillas')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Error al eliminar.')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (!editor) return null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-so-text tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {isEdit ? 'Editar plantilla' : 'Nueva plantilla'}
          </h1>
          <p className="text-sm text-so-muted mt-1">
            {isEdit ? 'Modificá el contenido y guardá los cambios.' : 'Completá el formulario y diseñá tu plantilla.'}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-3 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text transition-colors rounded"
        >
          Cancelar
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main editor area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Metadata */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-so-textMid mb-1.5">Nombre de la plantilla *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Carta documento — incumplimiento de contrato"
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-red/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-so-textMid mb-1.5">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Editor */}
          <div className="card overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-so-border flex-wrap">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Negrita"
              ><Bold size={13} /></ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Cursiva"
              ><Italic size={13} /></ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
                title="Subrayado"
              ><UnderlineIcon size={13} /></ToolbarButton>

              <div className="w-px h-4 bg-so-border mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Título H2"
              ><Heading2 size={13} /></ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Lista"
              ><List size={13} /></ToolbarButton>

              <div className="w-px h-4 bg-so-border mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                active={editor.isActive({ textAlign: 'left' })}
                title="Izquierda"
              ><AlignLeft size={13} /></ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                active={editor.isActive({ textAlign: 'center' })}
                title="Centro"
              ><AlignCenter size={13} /></ToolbarButton>

              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                active={editor.isActive({ textAlign: 'right' })}
                title="Derecha"
              ><AlignRight size={13} /></ToolbarButton>
            </div>

            {/* Content area */}
            <EditorContent editor={editor} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded transition-all',
                saving
                  ? 'bg-so-surface text-so-muted border border-so-border cursor-not-allowed'
                  : 'bg-so-red hover:opacity-80 text-white'
              )}
            >
              <Save size={13} />
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plantilla'}
            </button>

            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? 'Eliminando…' : 'Eliminar plantilla'}
              </button>
            )}
          </div>
        </div>

        {/* Variables panel */}
        <div className="w-60 flex-shrink-0">
          <div className="card p-4 sticky top-20">
            <p className="text-xs font-semibold text-so-textMid mb-1">Variables</p>
            <p className="text-[11px] text-so-muted mb-3">
              Hacé clic para insertar en el cursor.
            </p>
            <div className="flex flex-col gap-1.5">
              {VARIABLES.map(v => (
                <button
                  key={v.value}
                  onClick={() => insertVariable(v.value)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 text-[11px] text-so-textMid bg-so-surface hover:bg-so-border hover:text-so-text rounded border border-so-border transition-colors text-left"
                >
                  <span>{v.label}</span>
                  <span className="font-mono text-[10px] text-so-muted ml-1 truncate">{v.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-so-red/15 text-so-red'
          : 'text-so-muted hover:text-so-text hover:bg-so-surface'
      )}
    >
      {children}
    </button>
  )
}
