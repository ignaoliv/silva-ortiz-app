'use client'
import { useState } from 'react'
import KPICards from '@/components/expedientes/KPICards'
import ExpedientesTable from '@/components/expedientes/ExpedientesTable'
import AgendaLegal from '@/components/expedientes/AgendaLegal'
import type { DBCaso, DBCliente, DBUsuario, DBAudiencia, DBKPIs } from '@/lib/queries'

interface Props {
  kpis: DBKPIs
  hasPjn: boolean
  enNegociacion: number
  casos: DBCaso[]
  clientes: DBCliente[]
  usuarios: DBUsuario[]
  audiencias: DBAudiencia[]
}

export default function ExpedientesSection({ kpis, hasPjn, enNegociacion, casos, clientes, usuarios, audiencias }: Props) {
  const [negociacionActive, setNegociacionActive] = useState(false)

  return (
    <>
      <KPICards
        kpis={kpis}
        hasPjn={hasPjn}
        enNegociacion={enNegociacion}
        negociacionActive={negociacionActive}
        onNegociacionClick={() => setNegociacionActive(v => !v)}
      />
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <ExpedientesTable
            casos={casos}
            clientes={clientes}
            usuarios={usuarios}
            negociacionActive={negociacionActive}
            onClearNegociacion={() => setNegociacionActive(false)}
          />
        </div>
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <AgendaLegal casos={casos} audiencias={audiencias} hasPjn={hasPjn} />
        </div>
      </div>
    </>
  )
}
