import { checkDB } from '@/lib/db'
import { getAudiencias } from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import AudienciasTable from '@/components/audiencias/AudienciasTable'
import MiniCalendar from '@/components/audiencias/MiniCalendar'

export const metadata = { title: 'Audiencias · Silva Ortiz' }

export default async function AudienciasPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const audiencias = await getAudiencias()

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <AudienciasTable audiencias={audiencias} />
      </div>
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <MiniCalendar audiencias={audiencias} />
      </div>
    </div>
  )
}
