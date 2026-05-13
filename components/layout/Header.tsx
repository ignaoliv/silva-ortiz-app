'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { LogOut } from 'lucide-react'
import { initials } from '@/lib/utils'

const NAV = [
  { href: '/expedientes', label: 'Expedientes' },
  { href: '/audiencias',  label: 'Audiencias'  },
  { href: '/clientes',    label: 'Clientes'    },
]

export default function Header({ user }: { user: Session['user'] }) {
  const path = usePathname()

  return (
    <header className="bg-so-bg border-b border-so-border sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
        {/* Logo */}
        <Link href="/expedientes" className="flex-shrink-0">
          <Image
            src="/logo-silva-ortiz.png"
            alt="Silva Ortiz"
            width={160}
            height={28}
            className="h-7 w-auto brightness-0 invert"
            priority
          />
        </Link>

        {/* Separador vertical */}
        <div className="w-px h-5 bg-so-border flex-shrink-0" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 flex-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-2 text-xs font-medium tracking-widest uppercase transition-colors ${
                path.startsWith(n.href)
                  ? 'text-so-text border-b-2 border-so-red pb-[6px]'
                  : 'text-so-subtle hover:text-so-text'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Badge sistema */}
        <span className="text-[10px] tracking-widest uppercase text-so-muted hidden md:block">
          Sistema de gestión
        </span>

        {/* User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-so-red flex items-center justify-center text-[10px] font-bold text-white"
              title={user?.name ?? ''}
            >
              {initials(user?.name ?? 'U')}
            </div>
            <span className="text-xs text-so-textMid hidden lg:block">{user?.name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="text-so-muted hover:text-so-text transition-colors p-1"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
