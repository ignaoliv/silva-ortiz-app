import { notFound } from 'next/navigation'
import { getPlantilla } from '@/lib/queries'
import PlantillaEditor from '@/components/plantillas/PlantillaEditor'

export const metadata = { title: 'Editar plantilla · Silva Ortiz' }

export default async function EditarPlantillaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const plantilla = await getPlantilla(Number(id))
  if (!plantilla) notFound()

  return <PlantillaEditor plantilla={plantilla} />
}
