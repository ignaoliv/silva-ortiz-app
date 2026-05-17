import { checkDB } from '@/lib/db'
import {
  getCasos, getClientes, getUsuarios, getKPIs, getAudiencias, hasPjnCredentials,
  getCategorias, getFueros, getJuzgados, getJurisdicciones,
} from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import ExpedientesSection from '@/components/expedientes/ExpedientesSection'
import NuevoExpedienteButton from '@/components/expedientes/NuevoExpedienteButton'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = { title: 'Expedientes · Silva Ortiz' }

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  const { clienteId: clienteIdParam } = await searchParams
  const initialClienteId = clienteIdParam ? parseInt(clienteIdParam) : undefined
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
            href="/base-datos"
            className="px-3 py-2 text-xs text-so-muted border border-so-border hover:bg-so-surface hover:text-so-text transition-colors rounded"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Base de datos
          </a>
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

      {/* ── KPIs + tabla + sidebar ── */}
      <ExpedientesSection
        kpis={kpis}
        hasPjn={hasPjn}
        enNegociacion={casos.filter(c => /negoci/i.test(c.estado)).length}
        casos={casos}
        clientes={clientes}
        usuarios={usuarios}
        audiencias={audiencias}
        initialClienteId={initialClienteId}
      />
    </div>
  )
}
