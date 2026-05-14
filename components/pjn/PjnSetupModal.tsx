'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, RefreshCw, FileText, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'

export default function PjnSetupModal() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Mostrar modal después de 800ms para no ser intrusivo
    const t = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-so-card border border-so-ash/40 shadow-2xl overflow-hidden">
        {/* Franja superior de acento */}
        <div className="h-1 w-full bg-so-ash" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center bg-so-ash/15 border border-so-ash/30">
              <ShieldAlert size={18} className="text-so-ash" />
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-so-ash">
                Acción requerida
              </p>
              <h2 className="text-sm font-heading font-semibold text-so-text leading-tight">
                Configurá tu acceso al PJN
              </h2>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-so-muted hover:text-so-text transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-so-textMid leading-relaxed">
            Para sincronizar tus expedientes del Poder Judicial automáticamente, necesitás ingresar tus credenciales del portal PJN una sola vez.
          </p>

          {/* Beneficios */}
          <div className="space-y-2.5 bg-so-surface border border-so-border p-4">
            {[
              { icon: <FileText size={13} />,  label: 'Actuaciones automáticas', desc: 'Sin entrar al portal judicial' },
              { icon: <RefreshCw size={13} />, label: 'Sincronización nocturna',  desc: 'Cada noche descargamos todo' },
              { icon: <Sparkles size={13} />,  label: 'Resumen con IA',           desc: 'Claude analiza cada expediente' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-so-ash flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-xs font-medium text-so-text">{label}</p>
                  <p className="text-[10px] text-so-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer — acciones */}
        <div className="flex items-center gap-3 px-6 pb-6">
          {/* Botón principal fill-animation */}
          <button
            onClick={() => { setOpen(false); router.push('/perfil') }}
            className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2.5 py-3 border border-so-ash text-xs font-bold tracking-[0.15em] uppercase text-so-ash hover:text-white transition-colors duration-300"
          >
            <span className="absolute inset-0 bg-so-ash scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]" />
            <span className="relative flex items-center gap-2">
              Configurar ahora
              <ArrowRight size={13} />
            </span>
          </button>

          {/* Secundario */}
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-xs text-so-muted hover:text-so-text transition-colors border border-so-border hover:border-so-muted"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
