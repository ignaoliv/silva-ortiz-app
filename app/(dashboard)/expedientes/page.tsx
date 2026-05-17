import { checkDB } from '@/lib/db'
import {
  getCasos, getClientes, getUsuarios, getKPIs, getAudiencias, hasPjnCredentials,
  getCategorias, getFueros, getJuzgados, getJurisdicciones,
} from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import KPICards from '@/components/expedientes/KPICards'
import ExpedientesTable from '@/components/expedientes/ExpedientesTable'
import AgendaLegal from '@/components/expedientes/AgendaLegal'
import NuevoExpedienteButton from '@/components/expedientes/NuevoExpedienteButton'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = { title: 'Expedientes · Silva Ortiz' }

export default async function ExpedientesPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? ''

  const [casos, clientes, usuarios, kpis, audiencias, hasPjn, categorias, fueros, juzgados, jurisdicciones] = await Promise.all([
    getCasos(),
    getClientes(),
    getUsuarios(),
    getKPIs(),
    getAudiencias(),
    hasPjnCredentials(email),
    getCategorias(),
    getFueros(),
    getJuzgados(),
    getJurisdicciones(),
  ])

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-so-text tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Expedientes
          </h1>
          <p className="text-sm text-so-muted mt-1">
            Centralizá la gestión de casos, vencimientos y actuaciones del estudio.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <a
            href="/ayuda"
            className="px-3 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text transition-colors rounded"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Ayuda
          </a>
          <NuevoExpedienteButton
            clientes={clientes}
            usuarios={usuarios}
            categorias={categorias}
            fueros={fueros}
            juzgados={juzgados}
            jurisdicciones={jurisdicciones}
          />
        </div>
      </div>

      {/* ── KPI cards ── */}
      <KPICards
        kpis={kpis}
        hasPjn={hasPjn}
        enNegociacion={casos.filter(c => /negoci/i.test(c.estado)).length}
      />

      {/* ── Table + sidebar ── */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <ExpedientesTable casos={casos} clientes={clientes} usuarios={usuarios} />
        </div>
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <AgendaLegal casos={casos} audiencias={audiencias} hasPjn={hasPjn} />
        </div>
      </div>
    </div>
  )
}
