import KPICards from '@/components/expedientes/KPICards'
import ExpedientesTable from '@/components/expedientes/ExpedientesTable'
import VencimientosSidebar from '@/components/expedientes/VencimientosSidebar'
import { getKPIs, CASOS } from '@/lib/data'

export const metadata = { title: 'Expedientes · Silva Ortiz' }

export default function ExpedientesPage() {
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
