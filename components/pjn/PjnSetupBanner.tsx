'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X, RefreshCw, FileText, Sparkles } from 'lucide-react'

export default function PjnSetupBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="border-b border-so-ash/30 bg-so-surface relative">
      {/* Franja de acento izquierda */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-so-ash" />

      <div className="max-w-[1400px] mx-auto px-6 pl-10 py-5">
        <div className="flex items-start justify-between gap-8">

          {/* Contenido */}
          <div className="flex items-start gap-8 flex-1 min-w-0">
            {/* Label + título */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-so-ash mb-1.5">
                Sincronización PJN · No configurada
              </p>
              <p className="font-heading text-sm font-semibold text-so-text mb-1">
                Conectá tu cuenta del Poder Judicial para tener tus expedientes al día automáticamente.
              </p>
              <p className="text-xs text-so-muted leading-relaxed max-w-2xl">
                Cada noche descargamos tus actuaciones y documentos del PJN. Los encontrás acá sin tener que ingresar al portal judicial.
              </p>

              {/* Pasos */}
              <div className="flex items-center gap-6 mt-4">
                {[
                  { icon: <FileText size={11} />, label: 'Actuaciones automáticas' },
                  { icon: <RefreshCw size={11} />,  label: 'Sync nocturno diario' },
                  { icon: <Sparkles size={11} />,   label: 'Resumen IA por expediente' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[10px] text-so-muted">
                    <span className="text-so-ash">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0 self-center">
              <Link
                href="/perfil"
                className="group relative overflow-hidden flex items-center gap-3 border border-so-ash pl-5 pr-5 py-3 text-xs font-bold tracking-[0.15em] uppercase text-so-ash hover:text-white transition-colors duration-300 whitespace-nowrap"
              >
                <span className="absolute inset-0 bg-so-ash scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-400 ease-[cubic-bezier(.4,0,.2,1)]" />
                <span className="relative flex items-center gap-2.5">
                  Configurar ahora
                  <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 text-so-muted hover:text-so-text transition-colors mt-0.5"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
