'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DBCaso, DBCliente, DBUsuario, DBFuero, DBJuzgado, DBJurisdiccion } from '@/lib/queries'

interface LookupData {
  clientes: DBCliente[]
  usuarios: DBUsuario[]
  fueros: DBFuero[]
  juzgados: DBJuzgado[]
  jurisdicciones: DBJurisdiccion[]
}

export default function EditarExpedienteModal({
  caso,
  onClose,
  onSaved,
}: {
  caso: DBCaso
  onClose: () => void
  onSaved?: (updated: Partial<DBCaso>) => void
}) {
  const router = useRouter()
  const [lookup,  setLookup]  = useState<LookupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // form fields — initialized from caso
  const [caratula,             setCaratula]             = useState(caso.caratula)
  const [nroInterno,           setNroInterno]           = useState(caso.nro === '—' ? '' : caso.nro)
  const [nroExpediente,        setNroExpediente]        = useState(caso.exp === '—' ? '' : caso.exp)
  const [idCliente,            setIdCliente]            = useState(String(caso.clienteId ?? ''))
  const [idResponsable,        setIdResponsable]        = useState(String(caso.responsableId ?? ''))
  const [tipoProceso,          setTipoProceso]          = useState(caso.tipo === '—' ? '' : caso.tipo)
  const [fechaAlta,            setFechaAlta]            = useState(caso.fechaAlta ?? '')
  const [fechaNotif,           setFechaNotif]           = useState(caso.fechaNotif ?? '')
  const [fechaVencimiento,     setFechaVencimiento]     = useState(caso.vencimiento ?? '')
  const [cerrado,              setCerrado]              = useState(caso.cerrado)

  // dropdowns that need resolution from lookup
  const [idFuero,        setIdFuero]        = useState('')
  const [idJuzgado,      setIdJuzgado]      = useState('')
  const [idJurisdiccion, setIdJurisdiccion] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    fetch('/api/lookup')
      .then(r => r.json())
      .then((d: LookupData) => {
        setLookup(d)
        // Match current text values to IDs
        const fuero = d.fueros.find(f => f.nombre === caso.fuero)
        const juzgado = d.juzgados.find(j => j.nombre === caso.juzgado)
        const juris = d.jurisdicciones.find(j => j.nombre === caso.jurisdiccion)
        if (fuero)   setIdFuero(String(fuero.id))
        if (juzgado) setIdJuzgado(String(juzgado.id))
        if (juris)   setIdJurisdiccion(String(juris.id))
      })
      .finally(() => setLoading(false))
  }, [caso.fuero, caso.juzgado, caso.jurisdiccion])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!caratula.trim()) { setError('La carátula es obligatoria.'); return }
    if (!idCliente)        { setError('El cliente es obligatorio.'); return }
    if (!idResponsable)    { setError('El responsable es obligatorio.'); return }
    if (!fechaAlta)        { setError('La fecha de alta es obligatoria.'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/casos/${caso.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caratula:             caratula.trim(),
          idCliente:            parseInt(idCliente),
          idAbogadoResponsable: parseInt(idResponsable),
          nroInterno:           nroInterno.trim() || null,
          nroExpediente:        nroExpediente.trim() || null,
          idFuero:              idFuero        ? parseInt(idFuero)        : null,
          idJuzgado:            idJuzgado      ? parseInt(idJuzgado)      : null,
          idJurisdiccion:       idJurisdiccion ? parseInt(idJurisdiccion) : null,
          tipoProceso:          tipoProceso.trim() || 'Judicial',
          fechaAlta,
          fechaNotif:           fechaNotif || null,
          fechaVencimiento:     fechaVencimiento || null,
          cerrado,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Error al guardar.')
        return
      }
      onSaved?.({
        caratula: caratula.trim(),
        nro: nroInterno.trim() || caso.nro,
        exp: nroExpediente.trim() || caso.exp,
        cerrado,
      })
      router.refresh()
      onClose()
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  const abogados = lookup
    ? (lookup.usuarios.filter(u => u.tipo === 'Abogado').length > 0
        ? lookup.usuarios.filter(u => u.tipo === 'Abogado')
        : lookup.usuarios)
    : []

  const inputCls = 'w-full bg-so-bg border border-so-border rounded px-3 py-2 text-sm text-so-text focus:outline-none focus:border-so-red/50 transition-colors placeholder:text-so-muted'
  const labelCls = 'block text-[10px] tracking-widest uppercase text-so-muted mb-1.5'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-so-card border border-so-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-so-border">
          <div>
            <h2 className="text-sm font-medium text-so-text">Editar expediente</h2>
            <p className="text-[11px] text-so-subtle mt-0.5">{caso.nro} · {caso.caratula.slice(0, 60)}{caso.caratula.length > 60 ? '…' : ''}</p>
          </div>
          <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-so-muted">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Cargando datos…</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Carátula */}
            <div>
              <label className={labelCls}>Carátula *</label>
              <input
                type="text"
                value={caratula}
                onChange={e => setCaratula(e.target.value)}
                maxLength={500}
                required
                className={inputCls}
              />
            </div>

            {/* Cliente / Responsable */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cliente *</label>
                <select value={idCliente} onChange={e => setIdCliente(e.target.value)} required className={inputCls}>
                  <option value="">Seleccionar…</option>
                  {lookup?.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Responsable *</label>
                <select value={idResponsable} onChange={e => setIdResponsable(e.target.value)} required className={inputCls}>
                  <option value="">Seleccionar…</option>
                  {abogados.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Nros */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Nro. interno</label>
                <input type="text" value={nroInterno} onChange={e => setNroInterno(e.target.value)} maxLength={50} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nro. expediente</label>
                <input type="text" value={nroExpediente} onChange={e => setNroExpediente(e.target.value)} maxLength={100} className={inputCls} />
              </div>
            </div>

            {/* Fuero / Juzgado / Jurisdicción */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Fuero</label>
                <select value={idFuero} onChange={e => setIdFuero(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {lookup?.fueros.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Juzgado</label>
                <select value={idJuzgado} onChange={e => setIdJuzgado(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {lookup?.juzgados.slice(0, 200).map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Jurisdicción</label>
                <select value={idJurisdiccion} onChange={e => setIdJurisdiccion(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {lookup?.jurisdicciones.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Tipo proceso / Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tipo de proceso</label>
                <input type="text" value={tipoProceso} onChange={e => setTipoProceso(e.target.value)} maxLength={50} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha de alta *</label>
                <input type="date" value={fechaAlta} onChange={e => setFechaAlta(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notificación</label>
                <input type="date" value={fechaNotif} onChange={e => setFechaNotif(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Vencimiento</label>
                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cerrado}
                  onChange={e => setCerrado(e.target.checked)}
                  className="w-4 h-4 accent-so-red rounded"
                />
                <span className="text-xs text-so-text">Marcar como cerrado</span>
              </label>
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                {error}
              </div>
            )}
          </form>
        )}

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
            onClick={handleSave}
            disabled={saving || loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded transition-all',
              saving || loading
                ? 'bg-so-surface text-so-muted border border-so-border cursor-not-allowed'
                : 'bg-so-red hover:opacity-80 text-white'
            )}
          >
            <Save size={13} />
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
