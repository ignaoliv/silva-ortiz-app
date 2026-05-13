'use client'
import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push('/expedientes')
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-white font-serif text-4xl font-light tracking-tighter">
                <i>S</i><sub className="text-2xl">o</sub>
              </span>
            </div>
            <h1 className="text-white text-xl font-bold mt-1">Silva Ortiz Abogados</h1>
            <p className="text-blue-200 text-sm mt-1">Sistema de Gestión Legal</p>
          </div>

          {/* Body */}
          <div className="p-8">
            <h2 className="text-gray-800 text-lg font-semibold mb-1">Iniciar sesión</h2>
            <p className="text-gray-500 text-sm mb-6">
              Accedé con tu cuenta corporativa de Microsoft.
            </p>

            <button
              onClick={() => signIn('azure-ad', { callbackUrl: '/expedientes' })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                         border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300
                         transition-all duration-150 font-medium text-gray-700 shadow-sm"
            >
              {/* Microsoft logo SVG */}
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Continuar con Microsoft
            </button>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                Solo usuarios autorizados del estudio.<br/>
                Contactá al administrador si no podés acceder.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          © {new Date().getFullYear()} Silva Ortiz Abogados · Sistema interno
        </p>
      </div>
    </div>
  )
}
