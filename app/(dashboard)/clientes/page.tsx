import ClientesGrid from '@/components/clientes/ClientesGrid'

export const metadata = { title: 'Clientes · Silva Ortiz' }

export default function ClientesPage() {
  return (
    <>
      <h1 className="text-lg font-semibold text-gray-800 mb-4">Clientes</h1>
      <ClientesGrid />
    </>
  )
}
