'use client'
import Image from 'next/image'
import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (session) router.push('/expedientes')
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-so-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-so-border border-t-so-red rounded-full animate-spin" />
      </div>
    )
  }

  const errorMsg = error === 'AccessDenied'
    ? 'Tu cuenta no pertenece al dominio @silvaortiz.com.ar. Solo usuarios del estudio pueden acceder.'
    : error
    ? 'Ocurrió un error al iniciar sesión. Intentá de nuevo.'
    : null

  return (
    <div className="min-h-screen bg-so-bg flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-so-surface border-r border-so-border flex-col justify-between p-12">
        <Image
          src="/logo-silva-ortiz.png"
          alt="Silva Ortiz"
          width={200}
          height={35}
          className="brightness-0 invert opacity-90"
        />
        <div>
          <p className="font-serif text-3xl text-so-text leading-snug mb-4">
            Experiencia aplicada<br />a cada decisión.
          </p>
          <p className="text-sm text-so-subtle leading-relaxed max-w-sm">
            Asesoramiento legal estratégico para empresas y líderes empresariales.
          </p>
        </div>
        <p className="text-xs text-so-muted tracking-widest uppercase">
          Sistema interno · Acceso autorizado
        </p>
      </div>

      {/* Panel derecho — login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Image
              src="/logo-silva-ortiz.png"
              alt="Silva Ortiz"
              width={180}
              height={32}
              className="brightness-0 invert"
            />
          </div>

          <h1 className="text-xl font-heading font-light tracking-wide text-so-text mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-so-subtle mb-8">
            Accedé con tu cuenta corporativa de Microsoft.
          </p>

          {errorMsg && (
            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 text-xs text-red-400 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            onClick={() => signIn('azure-ad', { callbackUrl: '/expedientes' })}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded
                       border border-so-border bg-so-card text-so-text text-sm font-medium
                       hover:bg-so-surface hover:border-so-muted
                       transition-all duration-150"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
              <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Continuar con Microsoft
          </button>

          <div className="mt-8 pt-8 border-t border-so-border">
            <p className="text-xs text-so-muted text-center leading-relaxed">
              Solo cuentas <span className="text-so-textMid">@silvaortiz.com.ar</span> pueden acceder.<br />
              Contactá al administrador si no podés ingresar.
            </p>
          </div>

          <p className="text-center text-so-muted text-[11px] tracking-wider uppercase mt-8">
            © {new Date().getFullYear()} Silva Ortiz
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-so-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-so-border border-t-so-red rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
