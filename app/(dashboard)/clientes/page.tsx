import { checkDB } from '@/lib/db'
import DBError from '@/components/ui/DBError'
import ClientesGrid from '@/components/clientes/ClientesGrid'

export const metadata = { title: 'Clientes · Silva Ortiz' }

export default async function ClientesPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  return (
    <>
      <h1 className="text-lg font-semibold text-gray-800 mb-4">Clientes</h1>
      <ClientesGrid />
    </>
  )
}
