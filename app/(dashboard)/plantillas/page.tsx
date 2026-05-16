import { checkDB } from '@/lib/db'
import { getPlantillas } from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import PlantillaCard from '@/components/plantillas/PlantillaCard'

export const metadata = { title: 'Plantillas · Silva Ortiz' }

export default async function PlantillasPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const plantillas = await getPlantillas()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-so-text tracking-tight"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Plantillas de documentos
          </h1>
          <p className="text-sm text-so-muted mt-1">
            Creá y gestioná plantillas para generar escritos, cartas y oficios desde expedientes.
          </p>
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <a
            href="/plantillas/nueva"
            className="px-4 py-2 text-xs font-semibold bg-so-red hover:opacity-80 text-white transition-opacity rounded"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            + Nueva plantilla
          </a>
        </div>
      </div>

      {/* Grid or empty state */}
      {plantillas.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-so-muted text-sm">No hay plantillas todavía.</p>
          <p className="text-so-muted text-xs mt-1">
            Creá tu primera plantilla con el botón de arriba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(p => (
            <PlantillaCard key={p.id} plantilla={p} />
          ))}
        </div>
      )}
    </div>
  )
}
