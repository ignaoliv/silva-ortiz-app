import { checkDB } from '@/lib/db'
import DBError from '@/components/ui/DBError'
import KPICards from '@/components/expedientes/KPICards'
import ExpedientesTable from '@/components/expedientes/ExpedientesTable'
import VencimientosSidebar from '@/components/expedientes/VencimientosSidebar'
import { getKPIs, CASOS } from '@/lib/data'

export const metadata = { title: 'Expedientes · Silva Ortiz' }

export default async function ExpedientesPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const kpis = getKPIs()

  return (
    <>
      <KPICards kpis={kpis} />
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <ExpedientesTable />
        </div>
        <div className="w-64 flex-shrink-0 hidden lg:block" style={{ minHeight: '400px' }}>
          <VencimientosSidebar casos={CASOS} />
        </div>
      </div>
    </>
  )
}
