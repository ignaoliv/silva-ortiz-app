import {
  FileText, Users, FlaskConical, Clock, CheckCircle,
  AlertTriangle, CircleDot, Database,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const metadata = { title: 'Base de datos · Silva Ortiz' }

function StatCard({ icon: Icon, value, label, colorBg, colorText }: {
  icon: LucideIcon; value: string; label: string; colorBg: string; colorText: string
}) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-so-muted tracking-widest uppercase leading-snug">{label}</p>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${colorBg}`}>
          <Icon size={13} className={colorText} />
        </div>
      </div>
      <p className="text-3xl font-light text-so-text tabular-nums">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-[10px] font-semibold tracking-widest uppercase text-so-muted mb-4 pb-3 border-b border-so-border">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-so-border/50 last:border-0">
      <span className="text-sm text-so-textMid">{label}</span>
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-medium text-so-text tabular-nums">{value}</span>
        {sub && <p className="text-[10px] text-so-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function BaseDatosPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Database size={14} className="text-so-muted" />
          <span className="text-[10px] tracking-widest uppercase text-so-muted">Migración completada · 17 mayo 2026</span>
        </div>
        <h1 className="text-2xl font-semibold text-so-text tracking-tight">Base de datos</h1>
        <p className="text-sm text-so-muted mt-1">
          Estado actual de los datos del estudio migrados desde el sistema LexDoctor al nuevo sistema Silva Ortiz.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText}     value="19.890"    label="Expedientes"   colorBg="bg-so-red/10"      colorText="text-so-red" />
        <StatCard icon={Clock}        value="1.143.559" label="Movimientos"   colorBg="bg-blue-500/10"    colorText="text-blue-400" />
        <StatCard icon={FlaskConical} value="7.144"     label="Pruebas"       colorBg="bg-purple-500/10"  colorText="text-purple-400" />
        <StatCard icon={Users}        value="50"        label="Clientes"      colorBg="bg-emerald-500/10" colorText="text-emerald-400" />
      </div>

      {/* Qué se migró */}
      <Section title="Qué datos están disponibles">
        <Row label="Expedientes activos"    value="17.757"     sub="2.133 cerrados" />
        <Row label="Años de historial"      value="26 años"    sub="Desde el año 2000 hasta hoy" />
        <Row label="Movimientos cargados"   value="1.143.559"  sub="Historial completo de actuaciones por caso" />
        <Row label="Pruebas por expediente" value="7.144"      sub="Migradas con tipo y estado" />
        <Row label="Abogados y staff"       value="867"        sub="627 abogados · 240 administrativos" />
        <Row label="Juzgados cargados"      value="2.030" />
        <Row label="Jurisdicciones"         value="315" />
        <Row label="Fueros"                 value="130" />
        <Row label="Categorías de caso"     value="535" />
      </Section>

      {/* Clientes */}
      <Section title="Identificación de clientes">
        <p className="text-sm text-so-textMid mb-4 leading-relaxed">
          En el sistema anterior, el cliente de cada expediente estaba escrito como texto libre. Se aplicó un algoritmo de búsqueda automática para identificar a qué cliente pertenece cada caso.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-so-surface border border-so-border text-center">
            <p className="text-2xl font-light text-so-text tabular-nums">6.638</p>
            <p className="text-[10px] text-so-muted mt-1">con cliente asignado</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">33.4% del total</p>
          </div>
          <div className="p-3 rounded-lg bg-so-surface border border-so-border text-center">
            <p className="text-2xl font-light text-so-text tabular-nums">13.252</p>
            <p className="text-[10px] text-so-muted mt-1">sin cliente asignado</p>
            <p className="text-[10px] text-amber-400 mt-0.5">66.6% del total</p>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-so-textMid leading-relaxed">
              El 66% de los expedientes no pudo vincularse automáticamente porque el nombre del cliente en el sistema anterior no coincidía con ningún registro. Aparecen como <em className="text-so-text">"_Sin cliente identificado"</em> y pueden corregirse desde el botón Editar de cada expediente.
            </p>
          </div>
        </div>

        <p className="text-[10px] tracking-widest uppercase text-so-muted mb-2">Top clientes por expedientes</p>
        {[
          ['EXPERTA ART SA',                   '3.177'],
          ['PROVINCIA SEGUROS S.A.',              '794'],
          ['La Caja ART S.A.',                    '730'],
          ['Wal Mart Argentina S.R.L.',           '593'],
          ['Liberty ART S.A.',                    '347'],
        ].map(([nombre, cant]) => (
          <div key={nombre} className="flex items-center justify-between py-1.5 border-b border-so-border/40 last:border-0">
            <span className="text-xs text-so-textMid">{nombre}</span>
            <span className="text-xs font-medium text-so-text tabular-nums">{cant} exp.</span>
          </div>
        ))}
      </Section>

      {/* Estados procesales */}
      <Section title="Estados procesales">
        <p className="text-sm text-so-textMid mb-4 leading-relaxed">
          Se recuperó el historial de cambios de estado de cada expediente. El estado actual es el último registrado en el sistema anterior.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-so-surface border border-so-border text-center">
            <p className="text-2xl font-light text-so-text tabular-nums">7.588</p>
            <p className="text-[10px] text-so-muted mt-1">con estado actual asignado</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">38.1% del total</p>
          </div>
          <div className="p-3 rounded-lg bg-so-surface border border-so-border text-center">
            <p className="text-2xl font-light text-so-text tabular-nums">1.237</p>
            <p className="text-[10px] text-so-muted mt-1">estados procesales distintos</p>
            <p className="text-[10px] text-so-muted mt-0.5">del sistema anterior</p>
          </div>
        </div>

        <p className="text-[10px] tracking-widest uppercase text-so-muted mb-2">Estados más frecuentes</p>
        {[
          ['FACTURADO',     '932'],
          ['CONCILIADO',    '608'],
          ['LESIONES',      '465'],
          ['ARCHIVAR',      '464'],
          ['DAÑO MATERIAL', '328'],
        ].map(([estado, cant]) => (
          <div key={estado} className="flex items-center justify-between py-1.5 border-b border-so-border/40 last:border-0">
            <span className="text-xs text-so-textMid">{estado}</span>
            <span className="text-xs font-medium text-so-text tabular-nums">{cant} casos</span>
          </div>
        ))}
      </Section>

      {/* Pendiente */}
      <Section title="Qué falta · pendiente">
        <div className="space-y-3">
          {[
            {
              title: 'Documentos adjuntos de movimientos',
              desc: 'El sistema anterior tenía 91 GB de documentos (oficios, escritos, pericias) en un formato propietario. Aún no están disponibles — requieren trabajo técnico de decodificación. Cuando estén listos, aparecerán vinculados a cada movimiento.',
            },
            {
              title: 'Clientes sin identificar (66%)',
              desc: 'Se pueden corregir manualmente desde cada expediente con el botón Editar, o con una mejora futura del algoritmo de asignación automática.',
            },
            {
              title: 'Tipos de movimientos sin clasificar',
              desc: 'Todos los movimientos importados aparecen con tipo "Otro" porque el sistema anterior no tenía categorías compatibles. El tipo real figura en las observaciones de cada movimiento.',
            },
          ].map(({ title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3.5 rounded-lg bg-so-surface border border-so-border">
              <CircleDot size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-so-text mb-0.5">{title}</p>
                <p className="text-[11px] text-so-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Integridad */}
      <Section title="Validación de integridad">
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-4">
          <CheckCircle size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-so-textMid leading-relaxed">
            Toda la información fue validada: 14 tablas migradas con conteo exacto, 43 restricciones de integridad verificadas y 0 registros con error. La migración es auditable en cualquier momento.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ['14 / 14', 'Tablas migradas'],
            ['43 / 43', 'Validaciones OK'],
            ['0',       'Errores'],
          ].map(([val, lbl]) => (
            <div key={lbl} className="p-3 rounded-lg bg-so-surface border border-so-border">
              <p className="text-xl font-light text-so-text tabular-nums">{val}</p>
              <p className="text-[10px] text-so-muted mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
