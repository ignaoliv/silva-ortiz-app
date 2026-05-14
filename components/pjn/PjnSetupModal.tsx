'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, RefreshCw, FileText, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'

export default function PjnSetupModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-so-card border border-so-border shadow-2xl overflow-hidden">

        {/* Franja superior */}
        <div className="h-0.5 w-full bg-so-ash" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-so-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-so-ash/10 border border-so-ash/25 flex-shrink-0">
              <ShieldAlert size={15} className="text-so-ash" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-so-ash leading-none mb-0.5">
                Acción requerida
              </p>
              <h2 className="text-[15px] font-semibold text-so-text leading-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Configurá tu acceso al PJN
              </h2>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-so-muted hover:text-so-text transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-[13px] text-so-textMid leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            Ingresá tus credenciales del portal PJN una sola vez para sincronizar tus expedientes automáticamente.
          </p>

          {/* Beneficios */}
          <div className="divide-y divide-so-border border border-so-border">
            {[
              { icon: <FileText size={12} />,  label: 'Actuaciones automáticas', desc: 'Sin ingresar al portal judicial' },
              { icon: <RefreshCw size={12} />, label: 'Sincronización nocturna',  desc: 'Descarga diaria de novedades'   },
              { icon: <Sparkles size={12} />,  label: 'Análisis con IA',          desc: 'Claude resume cada expediente'  },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-3.5 py-3 bg-so-surface">
                <span className="text-so-ash flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-so-text leading-none mb-0.5">{label}</p>
                  <p className="text-[11px] text-so-muted leading-none">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-stretch gap-0 px-5 pb-5">
          {/* Botón principal */}
          <button
            onClick={() => { setOpen(false); router.push('/perfil') }}
            className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2 py-2.5 bg-so-ash text-white text-[11px] font-bold tracking-[0.14em] uppercase hover:bg-so-ashLight transition-colors duration-200"
          >
            Configurar ahora
            <ArrowRight size={12} />
          </button>

          {/* Separador vertical */}
          <div className="w-px bg-so-ashLight/30" />

          {/* Secundario */}
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 text-[11px] font-medium text-so-text bg-so-surface hover:bg-so-border transition-colors border-l-0"
          >
            Ahora no
          </button>
        </div>

      </div>
    </div>
  )
}
