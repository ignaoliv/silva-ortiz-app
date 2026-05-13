'use client'
import Link from 'next/link'
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
    <header className="bg-blue-900 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/expedientes" className="font-serif text-2xl font-light tracking-tighter select-none">
          <i>S</i><sub className="text-base">o</sub>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                path.startsWith(n.href)
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-500 flex items-center justify-center text-xs font-bold"
              title={user?.name ?? ''}
            >
              {initials(user?.name ?? 'U')}
            </div>
            <span className="text-sm text-blue-200 hidden md:block">{user?.name}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="text-blue-300 hover:text-white transition-colors p-1"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
