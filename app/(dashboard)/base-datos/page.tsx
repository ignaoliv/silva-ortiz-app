import {
  FileText, Users, Scale, FlaskConical, Clock, CheckCircle,
  AlertTriangle, CircleDot, ChevronRight, Database, Layers,
} from 'lucide-react'

export const metadata = { title: 'Base de datos · Silva Ortiz' }

function StatCard({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: string; label: string; color: string
}) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <p className="text-3xl font-light text-so-text tabular-nums">{value}</p>
      </div>
      <p className="text-[11px] text-so-muted tracking-wide">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-so-muted mb-4 pb-3 border-b border-so-border">
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
      <div className="text-right">
        <span className="text-sm font-medium text-so-text">{value}</span>
        {sub && <p className="text-[10px] text-so-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function BaseDatosPage() {
  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database size={16} className="text-so-muted" />
          <span className="text-[10px] tracking-widest uppercase text-so-muted">Migración completada · 17 mayo 2026</span>
        </div>
        <h1 className="text-2xl font-semibold text-so-text tracking-tight">Base de datos</h1>
        <p className="text-sm text-so-muted mt-1">
          Estado actual de los datos del estudio. Migración desde el sistema LexDoctor al nuevo sistema Silva Ortiz.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={FileText}     value="19.890"     label="Expedientes"          color="bg-so-red" />
        <StatCard icon={Clock}        value="1.143.559"  label="Movimientos"          color="bg-blue-600" />
        <StatCard icon={FlaskConical} value="7.144"      label="Pruebas"              color="bg-purple-600" />
        <StatCard icon={Users}        value="50"         label="Clientes"             color="bg-emerald-600" />
      </div>

      {/* Qué se migró */}
      <Section title="Qué datos están disponibles">
        <div className="space-y-0">
          <Row label="Expedientes activos" value="17.757" sub="2.133 cerrados" />
          <Row label="Años de historial"   value="26 años" sub="Desde el año 2000 hasta hoy" />
          <Row label="Movimientos cargados" value="1.143.559" sub="Historial completo de actuaciones por caso" />
          <Row label="Pruebas por expediente" value="7.144" sub="Migradas con tipo y estado" />
          <Row label="Abogados y staff"    value="867" sub="627 abogados · 240 administrativos" />
          <Row label="Juzgados cargados"   value="2.030" />
          <Row label="Jurisdicciones"      value="315" />
          <Row label="Fueros"              value="130" />
          <Row label="Categorías de caso"  value="535" />
        </div>
      </Section>

      {/* Clientes */}
      <Section title="Identificación de clientes">
        <p className="text-sm text-so-textMid mb-4 leading-relaxed">
          En el sistema anterior, el cliente de cada expediente estaba escrito como texto libre (no como un registro vinculado). Se aplicó un algoritmo de búsqueda automática para identificar a qué cliente pertenece cada caso.
        </p>

        <div className="space-y-0 mb-5">
          <Row label="Casos con cliente identificado" value="6.638" sub="33.4% del total" />
          <Row label="Casos sin cliente asignado"     value="13.252" sub="Quedan con '_Sin cliente identificado'" />
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300 mb-1">Clientes no identificados</p>
              <p className="text-[11px] text-so-textMid leading-relaxed">
                El 66% de los expedientes no pudo vincularse automáticamente a un cliente porque el nombre en el expediente original no coincide con ningún cliente registrado. Estos casos quedaron agrupados bajo <em>"_Sin cliente identificado"</em> y pueden corregirse manualmente desde el expediente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] tracking-widest uppercase text-so-muted mb-2">Top clientes por expedientes</p>
          {[
            ['EXPERTA ART SA',                        '3.177'],
            ['PROVINCIA SEGUROS S.A.',                  '794'],
            ['La Caja ART S.A.',                        '730'],
            ['Wal Mart Argentina S.R.L.',               '593'],
            ['Liberty ART S.A.',                        '347'],
          ].map(([nombre, cant]) => (
            <div key={nombre} className="flex items-center justify-between text-xs">
              <span className="text-so-textMid">{nombre}</span>
              <span className="font-medium text-so-text tabular-nums">{cant} exp.</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Estados procesales */}
      <Section title="Estados procesales">
        <p className="text-sm text-so-textMid mb-4 leading-relaxed">
          Se recuperó el historial completo de cambios de estado de cada expediente. El estado actual de cada caso es el último registrado en el sistema anterior.
        </p>
        <div className="space-y-0 mb-4">
          <Row label="Expedientes con estado actual" value="7.588" sub="38% del total · los demás no tenían estado registrado" />
          <Row label="Estados procesales distintos"  value="1.237" sub="Consolidados desde el sistema anterior" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] tracking-widest uppercase text-so-muted mb-2">Estados más frecuentes</p>
          {[
            ['FACTURADO',    '932'],
            ['CONCILIADO',   '608'],
            ['LESIONES',     '465'],
            ['ARCHIVAR',     '464'],
            ['DAÑO MATERIAL','328'],
          ].map(([estado, cant]) => (
            <div key={estado} className="flex items-center justify-between text-xs">
              <span className="text-so-textMid">{estado}</span>
              <span className="font-medium text-so-text tabular-nums">{cant} casos</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Pendiente */}
      <Section title="Qué falta / pendiente">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-so-surface border border-so-border">
            <CircleDot size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-so-text mb-0.5">Documentos adjuntos de movimientos</p>
              <p className="text-[11px] text-so-muted leading-relaxed">
                El sistema anterior tenía 91 GB de documentos (oficios, escritos, pericias) guardados en un formato propietario. Aún no están disponibles porque requieren trabajo técnico para decodificarlos. Cuando estén listos, aparecerán vinculados a cada movimiento.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-so-surface border border-so-border">
            <CircleDot size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-so-text mb-0.5">Clientes sin identificar</p>
              <p className="text-[11px] text-so-muted leading-relaxed">
                El 66% de los expedientes no tiene cliente asignado. Se pueden corregir manualmente desde cada expediente usando el botón Editar, o mediante una mejora futura del algoritmo de identificación automática.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-so-surface border border-so-border">
            <CircleDot size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-so-text mb-0.5">Tipos de movimientos sin clasificar</p>
              <p className="text-[11px] text-so-muted leading-relaxed">
                Todos los movimientos importados aparecen con tipo "Otro" porque el sistema anterior no tenía categorías compatibles. El tipo real está anotado en las observaciones de cada movimiento. Se pueden reclasificar manualmente.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Integridad */}
      <Section title="Integridad de la migración">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-4">
          <CheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-so-textMid leading-relaxed">
            Toda la información fue validada: 14 tablas migradas con conteo exacto, 43 restricciones de integridad verificadas, 0 registros huérfanos. La migración es reversible y auditable en cualquier momento.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ['14 / 14', 'Tablas migradas'],
            ['43 / 43', 'Validaciones OK'],
            ['0', 'Registros con error'],
          ].map(([val, lbl]) => (
            <div key={lbl} className="p-3 rounded-lg bg-so-surface border border-so-border">
              <p className="text-lg font-light text-so-text tabular-nums">{val}</p>
              <p className="text-[10px] text-so-muted mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
