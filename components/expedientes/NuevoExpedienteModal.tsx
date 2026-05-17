'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, FilePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DBCliente, DBUsuario, DBCategoria, DBFuero, DBJuzgado, DBJurisdiccion,
} from '@/lib/queries'

interface Props {
  onClose: () => void
  clientes: DBCliente[]
  usuarios: DBUsuario[]
  categorias: DBCategoria[]
  fueros: DBFuero[]
  juzgados: DBJuzgado[]
  jurisdicciones: DBJurisdiccion[]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function NuevoExpedienteModal({
  onClose, clientes, usuarios, categorias, fueros, juzgados, jurisdicciones,
}: Props) {
  const router = useRouter()

  const [caratula,             setCaratula]             = useState('')
  const [idCategoria,          setIdCategoria]          = useState<string>('')
  const [idCliente,            setIdCliente]            = useState<string>('')
  const [idAbogadoResponsable, setIdAbogadoResponsable] = useState<string>('')
  const [nroInterno,           setNroInterno]           = useState('')
  const [nroExpediente,        setNroExpediente]        = useState('')
  const [idFuero,              setIdFuero]              = useState<string>('')
  const [idJuzgado,            setIdJuzgado]            = useState<string>('')
  const [idJurisdiccion,       setIdJurisdiccion]       = useState<string>('')
  const [tipoProceso,          setTipoProceso]          = useState('Judicial')
  const [fechaAlta,            setFechaAlta]            = useState(todayISO())
  const [fechaVencimiento,     setFechaVencimiento]     = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  // Solo abogados como responsables, pero si no hay ninguno, mostrar todos
  const abogados = usuarios.filter(u => u.tipo === 'Abogado')
  const responsables = abogados.length > 0 ? abogados : usuarios

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!caratula.trim()) { setError('La carátula es obligatoria.'); return }
    if (!idCategoria)     { setError('La categoría es obligatoria.'); return }
    if (!idCliente)       { setError('El cliente es obligatorio.'); return }
    if (!idAbogadoResponsable) { setError('El abogado responsable es obligatorio.'); return }
    if (!fechaAlta)       { setError('La fecha de alta es obligatoria.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caratula:             caratula.trim(),
          idCategoria:          parseInt(idCategoria),
          idCliente:            parseInt(idCliente),
          idAbogadoResponsable: parseInt(idAbogadoResponsable),
          nroInterno:           nroInterno.trim() || undefined,
          nroExpediente:        nroExpediente.trim() || undefined,
          idFuero:              idFuero        ? parseInt(idFuero)        : undefined,
          idJuzgado:            idJuzgado      ? parseInt(idJuzgado)      : undefined,
          idJurisdiccion:       idJurisdiccion ? parseInt(idJurisdiccion) : undefined,
          tipoProceso:          tipoProceso.trim() || 'Judicial',
          fechaAlta,
          fechaVencimiento:     fechaVencimiento || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear el expediente.'); return }
      onClose()
      router.refresh()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-so-card border border-so-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-so-border">
          <div>
            <h2 className="text-sm font-medium text-so-text">Nuevo expediente</h2>
            <p className="text-xs text-so-subtle mt-1">Completá los datos para crear un expediente.</p>
          </div>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Carátula */}
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Carátula *</label>
            <input
              type="text"
              value={caratula}
              onChange={e => setCaratula(e.target.value)}
              maxLength={500}
              required
              placeholder="Ej: González, Juan c/ Empresa S.A. s/ daños y perjuicios"
              className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text placeholder:text-so-muted focus:outline-none focus:border-so-red/50 transition-colors"
            />
          </div>

          {/* Categoría / Cliente / Abogado (required) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Categoría *</label>
              <select
                value={idCategoria}
                onChange={e => setIdCategoria(e.target.value)}
                required
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                <option value="">Seleccionar…</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Cliente *</label>
              <select
                value={idCliente}
                onChange={e => setIdCliente(e.target.value)}
                required
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                <option value="">Seleccionar…</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Abogado responsable *</label>
              <select
                value={idAbogadoResponsable}
                onChange={e => setIdAbogadoResponsable(e.target.value)}
                required
                className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
              >
                <option value="">Seleccionar…</option>
                {responsables.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.tipo ? `(${u.tipo})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-so-border pt-5">
            <p className="text-[10px] tracking-widest uppercase text-so-muted mb-3">Datos opcionales</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Nro. interno</label>
                <input
                  type="text"
                  value={nroInterno}
                  onChange={e => setNroInterno(e.target.value)}
                  maxLength={50}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Nro. expediente</label>
                <input
                  type="text"
                  value={nroExpediente}
                  onChange={e => setNroExpediente(e.target.value)}
                  maxLength={100}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Fuero</label>
                <select
                  value={idFuero}
                  onChange={e => setIdFuero(e.target.value)}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                >
                  <option value="">Sin especificar</option>
                  {fueros.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Juzgado</label>
                <select
                  value={idJuzgado}
                  onChange={e => setIdJuzgado(e.target.value)}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                >
                  <option value="">Sin especificar</option>
                  {juzgados.slice(0, 200).map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Jurisdicción</label>
                <select
                  value={idJurisdiccion}
                  onChange={e => setIdJurisdiccion(e.target.value)}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                >
                  <option value="">Sin especificar</option>
                  {jurisdicciones.map(ju => <option key={ju.id} value={ju.id}>{ju.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Tipo de proceso</label>
                <input
                  type="text"
                  value={tipoProceso}
                  onChange={e => setTipoProceso(e.target.value)}
                  maxLength={50}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Fecha de alta *</label>
                <input
                  type="date"
                  value={fechaAlta}
                  onChange={e => setFechaAlta(e.target.value)}
                  required
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-widest uppercase text-so-muted mb-1.5">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={e => setFechaVencimiento(e.target.value)}
                  className="w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-so-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text transition-colors rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded transition-all',
              saving
                ? 'bg-so-surface text-so-muted border border-so-border cursor-not-allowed'
                : 'bg-so-red hover:opacity-80 text-white'
            )}
          >
            <FilePlus size={13} />
            {saving ? 'Creando…' : 'Crear expediente'}
          </button>
        </div>
      </div>
    </div>
  )
}
