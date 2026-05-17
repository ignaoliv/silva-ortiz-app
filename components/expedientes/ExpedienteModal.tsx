'use client'
import { useState, useEffect } from 'react'
import { X, FileText, Clock, Calendar, DollarSign, StickyNote, BookOpen, Handshake, FileDown, Eye, Download, Scale } from 'lucide-react'
import type { DBCaso, DBMovimiento, DBAudiencia, DBHonorario } from '@/lib/queries'
import { fmtDateLarga, fmtMoney, cn } from '@/lib/utils'
import { BadgeEstadoCaso } from '@/components/ui/Badge'
import TabNotas from '@/components/expedientes/TabNotas'
import TabInstrucciones from '@/components/expedientes/TabInstrucciones'
import TabNegociacion from '@/components/expedientes/TabNegociacion'
import TabPjn from '@/components/expedientes/TabPjn'
import GenerarDocumentoModal from '@/components/plantillas/GenerarDocumentoModal'

const TABS = [
  { id: 'detalle',       label: 'Detalles',        icon: FileText   },
  { id: 'movimientos',   label: 'Movimientos',     icon: Clock      },
  { id: 'pjn',           label: 'PJN',             icon: Scale      },
  { id: 'audiencias',    label: 'Audiencias',      icon: Calendar   },
  { id: 'honorarios',    label: 'Honorarios',      icon: DollarSign },
  { id: 'notas',         label: 'Notas',           icon: StickyNote },
  { id: 'instrucciones', label: 'Instrucciones',   icon: BookOpen   },
  { id: 'negociacion',   label: 'Negociación',     icon: Handshake  },
]

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ExpedienteModal({ caso, onClose }: { caso: DBCaso; onClose: () => void }) {
  const [tab,          setTab]          = useState('detalle')
  const [movs,         setMovs]         = useState<DBMovimiento[]>([])
  const [auds,         setAuds]         = useState<DBAudiencia[]>([])
  const [hons,         setHons]         = useState<DBHonorario[]>([])
  const [loading,      setLoading]      = useState(false)
  const [genDocOpen,   setGenDocOpen]   = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [m, h] = await Promise.all([
        fetch(`/api/casos/${caso.id}/movimientos`).then(r => r.json()),
        fetch(`/api/casos/${caso.id}/honorarios`).then(r => r.json()),
      ])
      setMovs(m)
      setHons(h)
      setLoading(false)
    }
    fetchData()
  }, [caso.id])

  const MOV_COLORS = ['bg-so-red','bg-blue-500','bg-emerald-500','bg-amber-500','bg-purple-500']

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-so-card border border-so-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-so-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-so-muted tracking-wider">{caso.nro}</span>
              <BadgeEstadoCaso estado={caso.estado} />
            </div>
            <h2 className="text-sm font-medium text-so-text leading-snug">{caso.caratula}</h2>
            <p className="text-xs text-so-subtle mt-1">{caso.juzgado}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setGenDocOpen(true)}
              title="Generar documento"
              className="btn-gen-doc flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-so-text font-semibold rounded transition-all hover:scale-105"
            >
              <FileDown size={13} className="text-[#D4A847]" />
              Generar doc
            </button>
            <button onClick={onClose} className="text-so-muted hover:text-so-text transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs — scrollable para que quepan todas */}
        <div className="flex border-b border-so-border px-6 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-3 text-[11px] font-medium tracking-wide border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                  tab === t.id ? 'border-so-red text-so-text' : 'border-transparent text-so-muted hover:text-so-textMid')}>
                <Icon size={12} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'detalle' && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {([
                ['Expediente',     caso.exp],
                ['Fuero',          caso.fuero],
                ['Jurisdicción',   caso.jurisdiccion],
                ['Tipo de proceso',caso.tipo],
                ['Cliente',        caso.clienteNombre],
                ['Responsable',    caso.responsableNombre],
                ['Fecha de alta',  fmtDateLarga(caso.fechaAlta)],
                ['Notificación',   fmtDateLarga(caso.fechaNotif)],
                ['Vencimiento',    fmtDateLarga(caso.vencimiento)],
                ['Monto reclamado',caso.monto ? fmtMoney(caso.monto) : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] tracking-widest uppercase text-so-muted mb-1">{label}</p>
                  <p className="text-sm text-so-text">{value}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'movimientos' && (
            loading
              ? <p className="text-so-muted text-xs text-center py-8">Cargando...</p>
              : movs.length === 0
              ? <p className="text-so-muted text-xs text-center py-8">Sin movimientos registrados</p>
              : <ol className="relative border-l border-so-border ml-3 space-y-6">
                  {movs.map((m, i) => (
                    <li key={m.id} className="ml-6">
                      <span className={cn('absolute -left-[9px] w-4 h-4 rounded-full border-2 border-so-card', MOV_COLORS[i % MOV_COLORS.length])} />
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-so-text">{m.titulo}</span>
                        <span className="text-[10px] text-so-muted">{m.tipo}</span>
                        {m.urlDocumento && (
                          <span className="flex items-center gap-1 ml-auto">
                            <a
                              href={m.urlDocumento}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Ver documento"
                              className="text-so-muted hover:text-so-ash transition-colors"
                            >
                              <Eye size={12} />
                            </a>
                            <a
                              href={m.urlDocumento}
                              download
                              title="Descargar documento"
                              className="text-so-muted hover:text-so-ash transition-colors"
                            >
                              <Download size={12} />
                            </a>
                          </span>
                        )}
                      </div>
                      {m.descripcion && <p className="text-xs text-so-subtle leading-relaxed">{m.descripcion}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-so-muted">{m.usuario}</span>
                        <span className="text-so-border">·</span>
                        <span className="text-[10px] text-so-muted">{fmtDateLarga(m.fecha)}</span>
                        {m.urlDocumento && (
                          <>
                            <span className="text-so-border">·</span>
                            <span className="text-[10px] text-[#D4A847] tracking-wide">📎 doc adjunto</span>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
          )}

          {tab === 'pjn' && <TabPjn casoId={caso.id} />}

          {tab === 'audiencias' && (
            auds.length === 0
              ? <p className="text-so-muted text-xs text-center py-8">Sin audiencias registradas</p>
              : <ul className="space-y-3">
                  {auds.map(a => (
                    <li key={a.id} className="flex items-start gap-4 p-3 rounded-lg bg-so-surface border border-so-border">
                      <div className="text-center w-10 flex-shrink-0">
                        <p className="text-xl font-light text-so-text leading-none">{a.fecha.split('-')[2]}</p>
                        <p className="text-[10px] text-so-muted">{MESES[parseInt(a.fecha.split('-')[1]) - 1]}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-so-text">{a.tipo}</p>
                        <p className="text-xs text-so-subtle">{a.hora} · {a.lugar}</p>
                        <p className="text-[10px] text-so-muted mt-0.5">{a.abogado} · {a.modalidad}</p>
                      </div>
                    </li>
                  ))}
                </ul>
          )}

          {tab === 'notas' && <TabNotas casoId={caso.id} />}

          {tab === 'instrucciones' && <TabInstrucciones casoId={caso.id} />}

          {tab === 'negociacion' && <TabNegociacion casoId={caso.id} />}

          {tab === 'honorarios' && (
            loading
              ? <p className="text-so-muted text-xs text-center py-8">Cargando...</p>
              : hons.length === 0
              ? <p className="text-so-muted text-xs text-center py-8">Sin honorarios registrados</p>
              : <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-so-border">
                      {['Concepto','Fecha','Monto','Estado'].map(h => (
                        <th key={h} className={cn('pb-2 text-[10px] tracking-widest uppercase text-so-muted font-medium', h === 'Monto' || h === 'Estado' ? 'text-right' : 'text-left')}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-so-border">
                    {hons.map(h => (
                      <tr key={h.id}>
                        <td className="py-3 text-so-text text-xs">{h.concepto}</td>
                        <td className="py-3 text-so-subtle text-xs">{fmtDateLarga(h.fecha)}</td>
                        <td className="py-3 text-right font-medium text-so-text text-xs">{fmtMoney(h.monto)}</td>
                        <td className="py-3 text-right">
                          <span className={cn('badge', h.estado.toLowerCase().includes('pag') ? 'badge-green' : 'badge-amber')}>{h.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-so-border">
                      <td colSpan={2} className="pt-3 text-[10px] tracking-widest uppercase text-so-muted">Total</td>
                      <td className="pt-3 text-right font-medium text-so-text text-xs">{fmtMoney(hons.reduce((s, h) => s + h.monto, 0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
          )}
        </div>
      </div>
    </div>

    {genDocOpen && (
      <GenerarDocumentoModal
        casoId={caso.id}
        caratula={caso.caratula}
        onClose={() => setGenDocOpen(false)}
      />
    )}
    </>
  )
}
