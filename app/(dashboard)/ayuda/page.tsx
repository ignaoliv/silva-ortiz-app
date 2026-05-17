import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { FileText, FileSignature, Scale, Sparkles, Calendar, MessageCircle } from 'lucide-react'

export const metadata = { title: 'Ayuda · Silva Ortiz' }

const TOPICS = [
  {
    icon: FileText,
    title: 'Expedientes',
    desc: "Gestioná todos tus casos en /expedientes. Hacé click en cualquiera para ver detalles, movimientos, audiencias y honorarios.",
  },
  {
    icon: FileSignature,
    title: 'Plantillas de documentos',
    desc: "Creá plantillas en /plantillas con variables como {{caratula}} o {{cliente}}. Generalas como .docx desde el expediente con el botón 'Generar doc'.",
  },
  {
    icon: Scale,
    title: 'Sincronización PJN',
    desc: "Configurá tus credenciales en /perfil. La sincronización corre automáticamente cada noche y baja todas las actuaciones nuevas con sus PDFs.",
  },
  {
    icon: Sparkles,
    title: 'Resúmenes IA',
    desc: "Cada actuación con PDF tiene un botón de Claude que genera un resumen ejecutivo en español. Los resúmenes se cachean para acceso instantáneo.",
  },
  {
    icon: Calendar,
    title: 'Calendario Microsoft',
    desc: "Sincronizá audiencias y vencimientos al calendario 'Silva Ortiz' de Outlook. Configurá en /perfil (requiere autorización del admin).",
  },
]

export default async function AyudaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-so-text">Ayuda</h1>
        <p className="text-xs text-so-muted mt-0.5">Guía rápida del sistema</p>
      </div>

      {TOPICS.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-so-surface border border-so-border flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-so-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-so-text">{title}</p>
              <p className="text-xs text-so-muted mt-1.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-so-surface border border-so-border flex items-center justify-center flex-shrink-0">
            <MessageCircle size={16} className="text-so-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-so-text">¿Necesitás ayuda adicional?</p>
            <p className="text-xs text-so-muted mt-1.5 leading-relaxed">
              Usá el botón de feedback (esquina inferior derecha) o escribinos a soporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
