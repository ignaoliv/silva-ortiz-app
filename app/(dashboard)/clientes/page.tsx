import { checkDB } from '@/lib/db'
import { getClientes, getCasos } from '@/lib/queries'
import DBError from '@/components/ui/DBError'
import ClientesGrid from '@/components/clientes/ClientesGrid'

export const metadata = { title: 'Clientes · Silva Ortiz' }

export default async function ClientesPage() {
  const connected = await checkDB(2)
  if (!connected) return <DBError />

  const [clientes, casos] = await Promise.all([getClientes(), getCasos()])

  return (
    <ClientesGrid clientes={clientes} casos={casos} />
  )
}
