import AudienciasTable from '@/components/audiencias/AudienciasTable'
import MiniCalendar from '@/components/audiencias/MiniCalendar'
import { AUDIENCIAS } from '@/lib/data'

export const metadata = { title: 'Audiencias · Silva Ortiz' }

export default function AudienciasPage() {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-gray-800 mb-4">Audiencias</h1>
        <AudienciasTable />
      </div>
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <MiniCalendar audiencias={AUDIENCIAS} />
      </div>
    </div>
  )
}
