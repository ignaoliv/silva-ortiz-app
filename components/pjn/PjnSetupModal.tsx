'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check } from 'lucide-react'

const BENEFICIOS = [
  {
    label: 'Actuaciones actualizadas',
    desc:  'Detectamos nuevas actuaciones sin ingresar manualmente al portal.',
  },
  {
    label: 'Sincronización diaria',
    desc:  'Actualizamos novedades y vencimientos todos los días.',
  },
  {
    label: 'Resúmenes con IA',
    desc:  'Convertimos cada expediente en una vista clara y accionable.',
  },
]

export default function PjnSetupModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-so-card border border-so-border shadow-2xl overflow-hidden">

        {/* Cierre */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-so-muted hover:text-so-text transition-colors"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>

        {/* Contenido */}
        <div className="px-8 pt-8 pb-6 space-y-6">

          {/* Eyebrow + título + bajada */}
          <div className="space-y-2 pr-6">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-so-ash">
              Acceso PJN
            </p>
            <h2 className="text-2xl font-semibold text-so-text leading-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Conectá tu cuenta PJN
            </h2>
            <p className="text-sm text-so-textMid leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Ingresá tus credenciales una sola vez para sincronizar expedientes, actuaciones y vencimientos automáticamente.
            </p>
          </div>

          {/* Beneficios */}
          <div className="space-y-4">
            {BENEFICIOS.map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3.5">
                <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-so-ash/20 border border-so-ash/40">
                  <Check size={11} className="text-so-ash" strokeWidth={2.5} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] font-semibold text-so-text leading-snug" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {label}
                  </p>
                  <p className="text-[12px] text-so-muted leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 pt-2 flex flex-col gap-3">
          <button
            onClick={() => { setOpen(false); router.push('/perfil') }}
            className="w-full py-3 bg-so-ash hover:bg-so-ashLight text-white text-[13px] font-semibold transition-colors duration-200"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Conectar PJN
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full py-2 text-[12px] text-so-muted hover:text-so-text transition-colors text-center"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Hacerlo más tarde
          </button>
        </div>

      </div>
    </div>
  )
}
