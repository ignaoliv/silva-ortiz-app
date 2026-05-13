import { checkDB } from '@/lib/db'
import { getCasos, getClientes, getUsuarios, getKPIs } from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import KPICards from '@/components/expedientes/KPICards'
import ExpedientesTable from '@/components/expedientes/ExpedientesTable'
import VencimientosSidebar from '@/components/expedientes/VencimientosSidebar'

export const metadata = { title: 'Expedientes · Silva Ortiz' }

export default async function ExpedientesPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const [casos, clientes, usuarios, kpis] = await Promise.all([
    getCasos(),
    getClientes(),
    getUsuarios(),
    getKPIs(),
  ])

  return (
    <>
      <KPICards kpis={kpis} />
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <ExpedientesTable casos={casos} clientes={clientes} usuarios={usuarios} />
        </div>
        <div className="w-64 flex-shrink-0 hidden lg:block" style={{ minHeight: '400px' }}>
          <VencimientosSidebar casos={casos} />
        </div>
      </div>
    </>
  )
}
