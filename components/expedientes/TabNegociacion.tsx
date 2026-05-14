'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from 'lucide-react'
import type { DBNegociacion, DBOfertaHistorial } from '@/lib/queries'
import { fmtMoney, fmtDateLarga } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ESTADOS = ['Sin iniciar', 'En curso', 'Pausada', 'Acuerdo', 'Fracasó']

const TIPO_OPTS = [
  { value: 'Oferta',       label: 'Nueva oferta nuestra',    color: 'text-blue-400'    },
  { value: 'Contraoferta', label: 'Contraoferta recibida',   color: 'text-amber-400'   },
  { value: 'Acuerdo',      label: 'Acuerdo alcanzado',       color: 'text-emerald-400' },
  { value: 'Rechazo',      label: 'Oferta rechazada',        color: 'text-red-400'     },
]

function tipoIcon(tipo: string) {
  if (tipo === 'Oferta')       return <TrendingUp  size={12} className="text-blue-400"    />
  if (tipo === 'Contraoferta') return <TrendingDown size={12} className="text-amber-400"  />
  if (tipo === 'Acuerdo')      return <CheckCircle  size={12} className="text-emerald-400"/>
  if (tipo === 'Rechazo')      return <XCircle      size={12} className="text-red-400"    />
  return <Minus size={12} className="text-so-muted" />
}

function tipoColor(tipo: string) {
  if (tipo === 'Oferta')       return 'border-blue-400/40 bg-blue-400/5'
  if (tipo === 'Contraoferta') return 'border-amber-400/40 bg-amber-400/5'
  if (tipo === 'Acuerdo')      return 'border-emerald-400/40 bg-emerald-400/5'
  if (tipo === 'Rechazo')      return 'border-red-400/40 bg-red-400/5'
  return 'border-so-border'
}

function estadoBadge(estado: string) {
  if (estado === 'Acuerdo')    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
  if (estado === 'Fracasó')    return 'bg-red-500/15 text-red-400 border border-red-500/30'
  if (estado === 'En curso')   return 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
  if (estado === 'Pausada')    return 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
  return 'bg-so-surface text-so-muted border border-so-border'
}

function parseMonto(s: string): number | null {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="border border-so-border bg-so-surface p-4">
      <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-so-muted mb-2">{label}</p>
      <p className={cn('text-lg font-light leading-none', accent ?? 'text-so-text')}>{value}</p>
      {sub && <p className="text-[10px] text-so-muted mt-1">{sub}</p>}
    </div>
  )
}

// ── Formulario nueva oferta ───────────────────────────────────────────────────
function FormOferta({
  casoId,
  onDone,
}: { casoId: number; onDone: () => void }) {
  const [tipo,        setTipo]        = useState('Oferta')
  const [montoStr,    setMontoStr]    = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving,      setSaving]      = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const monto = parseMonto(montoStr)
    await fetch(`/api/casos/${casoId}/negociacion/oferta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, monto, descripcion }),
    })
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={submit} className="border border-so-border bg-so-surface p-4 space-y-3">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-muted">
        Registrar movimiento
      </p>

      {/* Tipo */}
      <div className="grid grid-cols-2 gap-2">
        {TIPO_OPTS.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTipo(o.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 border text-left transition-colors text-[11px]',
              tipo === o.value
                ? 'border-so-ash bg-so-ash/10 text-so-text'
                : 'border-so-border text-so-muted hover:border-so-ash/50'
            )}
          >
            {tipoIcon(o.value)}
            {o.label}
          </button>
        ))}
      </div>

      {/* Monto */}
      {tipo !== 'Rechazo' && (
        <div>
          <label className="text-[10px] tracking-widest uppercase text-so-muted block mb-1">
            Monto ($)
          </label>
          <input
            type="text"
            value={montoStr}
            onChange={e => setMontoStr(e.target.value)}
            placeholder="Ej: 2500000"
            className="w-full bg-so-bg border border-so-border text-sm text-so-text px-3 py-2 focus:outline-none focus:border-so-ash"
          />
        </div>
      )}

      {/* Descripción */}
      <div>
        <label className="text-[10px] tracking-widest uppercase text-so-muted block mb-1">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Contexto, condiciones, observaciones..."
          className="w-full bg-so-bg border border-so-border text-sm text-so-text px-3 py-2 focus:outline-none focus:border-so-ash"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-[10px] text-so-muted hover:text-so-text transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase bg-so-ash text-white hover:bg-so-ashLight disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={10} className="animate-spin" />}
          Registrar
        </button>
      </div>
    </form>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function TabNegociacion({ casoId }: { casoId: number }) {
  const [data,      setData]      = useState<DBNegociacion | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editando,  setEditando]  = useState(false)
  const [estado,    setEstado]    = useState('')
  const [notasNeg,  setNotasNeg]  = useState('')
  const [maxStr,    setMaxStr]    = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function load() {
    setLoading(true)
    const d: DBNegociacion = await fetch(`/api/casos/${casoId}/negociacion`).then(r => r.json())
    setData(d)
    setEstado(d.estado)
    setNotasNeg(d.notas ?? '')
    setMaxStr(d.montoMaxCliente != null ? String(d.montoMaxCliente) : '')
    setLoading(false)
  }

  useEffect(() => { load() }, [casoId])

  async function guardar() {
    setSaving(true)
    await fetch(`/api/casos/${casoId}/negociacion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado,
        notas:           notasNeg || null,
        montoMaxCliente: parseMonto(maxStr),
        montoOfrecido:   data?.montoOfrecido ?? null,
        contraoferta:    data?.contraoferta  ?? null,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setEditando(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-so-muted py-8 justify-center">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-xs tracking-widest uppercase">Cargando...</span>
      </div>
    )
  }

  if (!data) return <p className="text-xs text-so-muted py-8 text-center">Error al cargar</p>

  // Diferencia: oferta nuestra vs contraoferta
  const diferencia = data.montoOfrecido != null && data.contraoferta != null
    ? data.montoOfrecido - data.contraoferta
    : null

  const histActual = [...data.historial].reverse() // cronológico

  return (
    <div className="space-y-5">

      {/* KPIs ── 4 tarjetas */}
      <div className="grid grid-cols-4 gap-3">
        <KPI
          label="Máximo del cliente"
          value={data.montoMaxCliente != null ? fmtMoney(data.montoMaxCliente) : '—'}
          sub="Límite autorizado"
          accent="text-so-text"
        />
        <KPI
          label="Última oferta nuestra"
          value={data.montoOfrecido != null ? fmtMoney(data.montoOfrecido) : '—'}
          accent="text-blue-400"
        />
        <KPI
          label="Contraoferta recibida"
          value={data.contraoferta != null ? fmtMoney(data.contraoferta) : '—'}
          accent="text-amber-400"
        />
        <KPI
          label="Diferencia"
          value={diferencia != null ? fmtMoney(Math.abs(diferencia)) : '—'}
          sub={diferencia != null
            ? diferencia > 0 ? 'Estamos por encima' : 'Estamos por debajo'
            : undefined}
          accent={diferencia != null
            ? diferencia > 0 ? 'text-red-400' : 'text-emerald-400'
            : 'text-so-muted'}
        />
      </div>

      {/* Estado + config */}
      <div className="border border-so-border bg-so-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-muted">
              Estado de negociación
            </p>
            <span className={cn('text-[10px] font-bold px-2 py-0.5', estadoBadge(data.estado))}>
              {data.estado}
            </span>
          </div>
          <button
            onClick={() => setEditando(v => !v)}
            className="text-[10px] tracking-widest uppercase text-so-muted hover:text-so-ash transition-colors"
          >
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        {editando && (
          <div className="space-y-3 border-t border-so-border pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] tracking-widest uppercase text-so-muted block mb-1">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="w-full bg-so-bg border border-so-border text-sm text-so-text px-3 py-2 focus:outline-none focus:border-so-ash"
                >
                  {ESTADOS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-so-muted block mb-1">
                  Máximo autorizado por cliente ($)
                </label>
                <input
                  type="text"
                  value={maxStr}
                  onChange={e => setMaxStr(e.target.value)}
                  placeholder="Ej: 2000000"
                  className="w-full bg-so-bg border border-so-border text-sm text-so-text px-3 py-2 focus:outline-none focus:border-so-ash"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-widest uppercase text-so-muted block mb-1">
                Notas de negociación
              </label>
              <textarea
                value={notasNeg}
                onChange={e => setNotasNeg(e.target.value)}
                rows={3}
                className="w-full bg-so-bg border border-so-border text-sm text-so-text px-3 py-2 focus:outline-none focus:border-so-ash resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={guardar}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase bg-so-ash text-white hover:bg-so-ashLight disabled:opacity-50"
              >
                {saving ? <Loader2 size={10} className="animate-spin" /> : null}
                {saved ? '¡Guardado!' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {!editando && data.notas && (
          <p className="text-xs text-so-textMid leading-relaxed border-t border-so-border pt-3">
            {data.notas}
          </p>
        )}
      </div>

      {/* Historial + botón */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-muted">
            Historial de ofertas
          </p>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-so-ash hover:text-so-ashLight transition-colors"
          >
            <Plus size={12} />
            Registrar movimiento
          </button>
        </div>

        {showForm && (
          <div className="mb-4">
            <FormOferta
              casoId={casoId}
              onDone={() => { setShowForm(false); load() }}
            />
          </div>
        )}

        {histActual.length === 0 ? (
          <p className="text-xs text-so-muted text-center py-6 border border-dashed border-so-border">
            Sin movimientos registrados aún.
          </p>
        ) : (
          <div className="relative">
            {/* línea vertical */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-so-border" />

            <div className="space-y-3">
              {histActual.map((h: DBOfertaHistorial, i: number) => (
                <div key={h.id ?? i} className="flex gap-4 items-start">
                  {/* dot */}
                  <div className={cn(
                    'relative z-10 w-[30px] h-[30px] flex-shrink-0 flex items-center justify-center border rounded-full bg-so-card',
                    tipoColor(h.tipo)
                  )}>
                    {tipoIcon(h.tipo)}
                  </div>

                  <div className={cn(
                    'flex-1 border p-3 rounded-none',
                    tipoColor(h.tipo)
                  )}>
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-so-muted">
                        {h.tipo}
                      </span>
                      <span className="text-[10px] text-so-muted tabular-nums">
                        {fmtDateLarga(h.fecha)}
                      </span>
                    </div>
                    {h.monto != null && (
                      <p className="text-sm font-semibold text-so-text">
                        {fmtMoney(h.monto)}
                      </p>
                    )}
                    {h.descripcion && (
                      <p className="text-xs text-so-textMid mt-0.5">{h.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
